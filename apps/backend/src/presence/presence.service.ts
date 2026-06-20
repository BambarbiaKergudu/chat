import { Injectable, Logger } from '@nestjs/common';
import { UserStatus } from '@chat/shared';
import { ProposalService } from '../matchmaking/proposal.service';
import { RedisKeys } from '../redis/redis.keys';
import { RedisService } from '../redis/redis.service';
import { SessionService } from '../session/session.service';
import { toUserStatus } from '../session/session.dto';

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  constructor(
    private readonly sessionService: SessionService,
    private readonly redis: RedisService,
    private readonly proposalService: ProposalService,
  ) {}

  async handleDisconnect(socketId: string): Promise<void> {
    const session = await this.sessionService.getSessionBySocketId(socketId);
    if (!session) {
      return;
    }

    const status = toUserStatus(session.status);
    this.logger.log(
      `Disconnect: session ${session.sessionId}, status ${status}`,
    );

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
        // Room teardown — этап 4 (ChatModule)
        break;
      default:
        break;
    }

    await this.sessionService.cleanupSession(session.sessionId, socketId);
  }
}
