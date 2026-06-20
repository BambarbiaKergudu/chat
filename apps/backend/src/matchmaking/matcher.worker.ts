import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { UserStatus } from '@chat/shared';
import { RedisKeys } from '../redis/redis.keys';
import { RedisService } from '../redis/redis.service';
import { SessionService } from '../session/session.service';
import { toUserStatus } from '../session/session.dto';
import { areMutualMatch } from './match.filters';
import { CandidatePoolService } from './candidate-pool.service';
import { ProposalService } from './proposal.service';
import { SearchQueueService } from './search-queue.service';

@Injectable()
export class MatcherWorker {
  private readonly logger = new Logger(MatcherWorker.name);
  private running = false;

  constructor(
    private readonly searchQueue: SearchQueueService,
    private readonly candidatePool: CandidatePoolService,
    private readonly sessionService: SessionService,
    private readonly proposalService: ProposalService,
    private readonly redis: RedisService,
  ) {}

  @Interval(500)
  async runMatchingCycle(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      const searchers = await this.searchQueue.getAll();

      for (const initiatorId of searchers) {
        const initiator = await this.sessionService.getSession(initiatorId);
        if (
          !initiator ||
          toUserStatus(initiator.status) !== UserStatus.Searching
        ) {
          await this.searchQueue.remove(initiatorId);
          continue;
        }

        const pending = await this.redis.get(
          RedisKeys.searchPending(initiatorId),
        );
        if (pending) {
          continue;
        }

        const candidates = await this.candidatePool.getIdleSessionIds();

        for (const candidateId of candidates) {
          if (candidateId === initiatorId) {
            continue;
          }

          const candidate = await this.sessionService.getSession(candidateId);
          if (
            !candidate ||
            toUserStatus(candidate.status) !== UserStatus.Idle
          ) {
            continue;
          }

          if (!areMutualMatch(initiator, candidate)) {
            continue;
          }

          const created = await this.proposalService.tryCreateProposal(
            initiator,
            candidate,
          );

          if (created) {
            break;
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Matching cycle failed: ${error instanceof Error ? error.message : error}`,
      );
    } finally {
      this.running = false;
    }
  }
}
