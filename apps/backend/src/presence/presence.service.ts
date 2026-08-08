import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { UserStatus } from '@chat/shared';
import { ChatService } from '../chat/chat.service';
import { WsEmitterService } from '../gateway/ws-emitter.service';
import { ProposalService } from '../matchmaking/proposal.service';
import { RedisKeys } from '../redis/redis.keys';
import { RedisService } from '../redis/redis.service';
import { SessionService } from '../session/session.service';
import { toUserStatus } from '../session/session.dto';

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  private purging = false;

  constructor(
    private readonly sessionService: SessionService,
    private readonly redis: RedisService,
    private readonly proposalService: ProposalService,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
    @Inject(forwardRef(() => WsEmitterService))
    private readonly wsEmitter: WsEmitterService,
  ) {}

  async handleDisconnect(socketId: string): Promise<void> {
    const session = await this.sessionService.getSessionBySocketId(socketId);
    if (!session) {
      return;
    }

    this.logger.log(
      `Disconnect: session ${session.sessionId}, status ${session.status}`,
    );
    await this.releaseSession(session.sessionId, session.socketId);
  }

  @Interval(30_000)
  async purgeDeadSessionsInterval(): Promise<void> {
    await this.purgeDeadSessions();
  }

  /**
   * Remove Redis sessions whose sockets are no longer connected.
   * Needed after backend restart (Redis state survives, sockets do not).
   */
  async purgeDeadSessions(): Promise<void> {
    if (this.purging) {
      return;
    }
    this.purging = true;

    try {
      const sessionKeys = await this.redis.scanKeys('session:*');
      let purged = 0;

      for (const key of sessionKeys) {
        if (key.startsWith('session:room:')) {
          continue;
        }

        const sessionId = key.slice('session:'.length);
        const session = await this.sessionService.getSession(sessionId);
        if (!session) {
          await this.redis.del(key);
          continue;
        }

        if (this.wsEmitter.isSocketConnected(session.socketId)) {
          continue;
        }

        await this.releaseSession(session.sessionId, session.socketId);
        purged += 1;
      }

      await this.pruneSessionSet(RedisKeys.searchQueue);
      await this.pruneSessionSet(RedisKeys.idlePool);
      await this.pruneSessionSet(RedisKeys.proposedActive);

      if (purged > 0) {
        this.logger.log(`Purged ${purged} dead session(s)`);
      }
    } finally {
      this.purging = false;
    }
  }

  private async releaseSession(
    sessionId: string,
    socketId: string,
  ): Promise<void> {
    const session = await this.sessionService.getSession(sessionId);
    if (!session) {
      return;
    }

    const status = toUserStatus(session.status);

    switch (status) {
      case UserStatus.Searching: {
        const pending = await this.redis.get(
          RedisKeys.searchPending(session.sessionId),
        );
        if (pending) {
          await this.proposalService.expireProposal(pending);
        }
        await this.redis.srem(RedisKeys.searchQueue, session.sessionId);
        break;
      }
      case UserStatus.Proposed:
        await this.proposalService.expireProposal(session.sessionId);
        break;
      case UserStatus.InChat:
        await this.chatService.leaveBySession(session.sessionId, 'disconnect');
        break;
      default:
        break;
    }

    await this.sessionService.cleanupSession(session.sessionId, socketId);
  }

  private async pruneSessionSet(setKey: string): Promise<void> {
    const members = await this.redis.smembers(setKey);
    for (const sessionId of members) {
      const session = await this.sessionService.getSession(sessionId);
      if (!session) {
        await this.redis.srem(setKey, sessionId);
      }
    }
  }
}
