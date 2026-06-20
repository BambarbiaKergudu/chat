import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { UserStatus } from '@chat/shared';
import { RedisKeys } from '../redis/redis.keys';
import { RedisService } from '../redis/redis.service';
import { SessionService } from '../session/session.service';
import { toUserStatus } from '../session/session.dto';
import { ProposalService } from './proposal.service';

@Injectable()
export class ProposalTimeoutService implements OnModuleInit {
  private readonly logger = new Logger(ProposalTimeoutService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly sessionService: SessionService,
    private readonly proposalService: ProposalService,
  ) {}

  onModuleInit() {
    this.logger.log('Proposal timeout checker started (500ms interval)');
  }

  @Interval(500)
  async checkExpiredProposals(): Promise<void> {
    const proposedIds = await this.redis.smembers(RedisKeys.proposedActive);

    for (const candidateSessionId of proposedIds) {
      const session = await this.sessionService.getSession(candidateSessionId);
      const proposalExists = await this.redis.exists(
        RedisKeys.proposal(candidateSessionId),
      );

      if (
        !session ||
        toUserStatus(session.status) !== UserStatus.Proposed ||
        !proposalExists
      ) {
        await this.proposalService.expireProposal(candidateSessionId);
      }
    }
  }
}
