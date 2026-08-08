import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import {
  MatchConnectedPayload,
  MatchProposalPayload,
  PAIR_BLOCK_TTL_SECONDS,
  PROPOSAL_TTL_SECONDS,
  ProposalData,
  ServerEvents,
  UserStatus,
} from '@chat/shared';
import { ChatService } from '../chat/chat.service';
import { WsEmitterService } from '../gateway/ws-emitter.service';
import { RedisKeys, RedisSessionData } from '../redis/redis.keys';
import { RedisService } from '../redis/redis.service';
import { SessionService } from '../session/session.service';
import { toUserStatus } from '../session/session.dto';
import { SearchQueueService } from './search-queue.service';
import { toPeerInfo } from './match.filters';

@Injectable()
export class ProposalService {
  private readonly logger = new Logger(ProposalService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly sessionService: SessionService,
    private readonly searchQueue: SearchQueueService,
    private readonly wsEmitter: WsEmitterService,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
  ) {}

  async tryCreateProposal(
    initiator: RedisSessionData,
    candidate: RedisSessionData,
  ): Promise<boolean> {
    if (initiator.sessionId === candidate.sessionId) {
      return false;
    }

    const freshCandidate = await this.sessionService.getSession(
      candidate.sessionId,
    );
    if (
      !freshCandidate ||
      toUserStatus(freshCandidate.status) !== UserStatus.Idle
    ) {
      return false;
    }

    if (!this.wsEmitter.isSocketConnected(freshCandidate.socketId)) {
      this.logger.warn(
        `Skipping dead candidate socket: ${freshCandidate.sessionId}`,
      );
      await this.sessionService.cleanupSession(
        freshCandidate.sessionId,
        freshCandidate.socketId,
      );
      return false;
    }

    const freshInitiator = await this.sessionService.getSession(
      initiator.sessionId,
    );
    if (
      !freshInitiator ||
      toUserStatus(freshInitiator.status) !== UserStatus.Searching
    ) {
      return false;
    }

    if (!this.wsEmitter.isSocketConnected(freshInitiator.socketId)) {
      this.logger.warn(
        `Skipping dead initiator socket: ${freshInitiator.sessionId}`,
      );
      const pending = await this.redis.get(
        RedisKeys.searchPending(freshInitiator.sessionId),
      );
      if (pending) {
        await this.expireProposal(pending);
      }
      await this.sessionService.cleanupSession(
        freshInitiator.sessionId,
        freshInitiator.socketId,
      );
      return false;
    }

    const expiresAt = new Date(
      Date.now() + PROPOSAL_TTL_SECONDS * 1000,
    ).toISOString();

    const proposal: ProposalData = {
      initiatorSessionId: freshInitiator.sessionId,
      expiresAt,
    };

    await this.sessionService.updateStatus(
      freshCandidate.sessionId,
      UserStatus.Proposed,
    );

    await this.redis.setex(
      RedisKeys.proposal(freshCandidate.sessionId),
      PROPOSAL_TTL_SECONDS,
      JSON.stringify(proposal),
    );
    await this.redis.setex(
      RedisKeys.searchPending(freshInitiator.sessionId),
      PROPOSAL_TTL_SECONDS,
      freshCandidate.sessionId,
    );
    await this.redis.sadd(RedisKeys.proposedActive, freshCandidate.sessionId);

    const payload: MatchProposalPayload = {
      initiator: toPeerInfo(freshInitiator),
      expiresAt,
    };

    this.wsEmitter.emitToSocket(
      freshCandidate.socketId,
      ServerEvents.MatchProposal,
      payload,
    );

    this.logger.log(
      `Proposal sent: ${freshInitiator.sessionId} -> ${freshCandidate.sessionId}`,
    );

    return true;
  }

  async getProposal(candidateSessionId: string): Promise<ProposalData | null> {
    const raw = await this.redis.get(RedisKeys.proposal(candidateSessionId));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as ProposalData;
  }

  async declineProposal(candidateSessionId: string): Promise<void> {
    const proposal = await this.getProposal(candidateSessionId);
    await this.resetCandidate(candidateSessionId);
    if (proposal) {
      await this.blockPair(proposal.initiatorSessionId, candidateSessionId);
    }
    this.logger.log(`Proposal declined: ${candidateSessionId}`);
  }

  async expireProposal(candidateSessionId: string): Promise<void> {
    const session = await this.sessionService.getSession(candidateSessionId);
    if (!session || toUserStatus(session.status) !== UserStatus.Proposed) {
      await this.redis.del(RedisKeys.proposal(candidateSessionId));
      return;
    }

    await this.resetCandidate(candidateSessionId);
    this.logger.log(`Proposal expired: ${candidateSessionId}`);
  }

  async isPairBlocked(
    sessionIdA: string,
    sessionIdB: string,
  ): Promise<boolean> {
    return this.redis.exists(RedisKeys.matchBlock(sessionIdA, sessionIdB));
  }

  private async blockPair(
    sessionIdA: string,
    sessionIdB: string,
  ): Promise<void> {
    await this.redis.setex(
      RedisKeys.matchBlock(sessionIdA, sessionIdB),
      PAIR_BLOCK_TTL_SECONDS,
      '1',
    );
    this.logger.log(
      `Pair blocked for ${PAIR_BLOCK_TTL_SECONDS}s: ${sessionIdA} + ${sessionIdB}`,
    );
  }

  async acceptProposal(
    candidateSessionId: string,
  ): Promise<MatchConnectedPayload | null> {
    const proposal = await this.getProposal(candidateSessionId);
    if (!proposal) {
      return null;
    }

    const candidate = await this.sessionService.getSession(candidateSessionId);
    const initiator = await this.sessionService.getSession(
      proposal.initiatorSessionId,
    );

    if (
      !candidate ||
      !initiator ||
      toUserStatus(candidate.status) !== UserStatus.Proposed ||
      toUserStatus(initiator.status) !== UserStatus.Searching
    ) {
      await this.resetCandidate(candidateSessionId);
      return null;
    }

    const roomId = await this.chatService.createRoom(initiator, candidate);

    await this.searchQueue.remove(initiator.sessionId);
    await this.redis.del(
      RedisKeys.proposal(candidateSessionId),
      RedisKeys.searchPending(initiator.sessionId),
    );
    await this.redis.srem(RedisKeys.proposedActive, candidateSessionId);

    await this.sessionService.updateStatus(
      initiator.sessionId,
      UserStatus.InChat,
    );
    await this.sessionService.updateStatus(
      candidateSessionId,
      UserStatus.InChat,
    );

    const payloadForInitiator: MatchConnectedPayload = {
      roomId,
      peer: toPeerInfo(candidate),
    };

    const payloadForCandidate: MatchConnectedPayload = {
      roomId,
      peer: toPeerInfo(initiator),
    };

    this.wsEmitter.emitToSocket(
      initiator.socketId,
      ServerEvents.MatchConnected,
      payloadForInitiator,
    );
    this.wsEmitter.emitToSocket(
      candidate.socketId,
      ServerEvents.MatchConnected,
      payloadForCandidate,
    );

    this.logger.log(
      `Match connected: room ${roomId} (${initiator.sessionId} + ${candidateSessionId})`,
    );

    return payloadForCandidate;
  }

  private async resetCandidate(candidateSessionId: string): Promise<void> {
    const proposal = await this.getProposal(candidateSessionId);

    await this.redis.del(RedisKeys.proposal(candidateSessionId));
    await this.redis.srem(RedisKeys.proposedActive, candidateSessionId);

    if (proposal) {
      await this.redis.del(RedisKeys.searchPending(proposal.initiatorSessionId));
    }

    const session = await this.sessionService.getSession(candidateSessionId);
    if (session && toUserStatus(session.status) === UserStatus.Proposed) {
      await this.sessionService.updateStatus(
        candidateSessionId,
        UserStatus.Idle,
      );
    }
  }
}
