import { Injectable, Logger } from '@nestjs/common';
import {
  MatchConnectedPayload,
  MatchProposalPayload,
  PROPOSAL_TTL_SECONDS,
  ProposalData,
  ServerEvents,
  UserStatus,
} from '@chat/shared';
import { randomUUID } from 'crypto';
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

    const freshInitiator = await this.sessionService.getSession(
      initiator.sessionId,
    );
    if (
      !freshInitiator ||
      toUserStatus(freshInitiator.status) !== UserStatus.Searching
    ) {
      return false;
    }

    const expiresAt = new Date(
      Date.now() + PROPOSAL_TTL_SECONDS * 1000,
    ).toISOString();

    const proposal: ProposalData = {
      initiatorSessionId: initiator.sessionId,
      expiresAt,
    };

    await this.sessionService.updateStatus(
      candidate.sessionId,
      UserStatus.Proposed,
    );

    await this.redis.setex(
      RedisKeys.proposal(candidate.sessionId),
      PROPOSAL_TTL_SECONDS,
      JSON.stringify(proposal),
    );
    await this.redis.setex(
      RedisKeys.searchPending(initiator.sessionId),
      PROPOSAL_TTL_SECONDS,
      candidate.sessionId,
    );
    await this.redis.sadd(RedisKeys.proposedActive, candidate.sessionId);

    const payload: MatchProposalPayload = {
      initiator: toPeerInfo(initiator),
      expiresAt,
    };

    this.wsEmitter.emitToSocket(
      candidate.socketId,
      ServerEvents.MatchProposal,
      payload,
    );

    this.logger.log(
      `Proposal sent: ${initiator.sessionId} -> ${candidate.sessionId}`,
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
    await this.resetCandidate(candidateSessionId);
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

    const roomId = randomUUID();

    await this.redis.hset(RedisKeys.room(roomId), {
      userAId: initiator.sessionId,
      userBId: candidate.sessionId,
      userASocketId: initiator.socketId,
      userBSocketId: candidate.socketId,
    });

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
