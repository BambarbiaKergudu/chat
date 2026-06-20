import { Module, forwardRef } from '@nestjs/common';
import { SessionModule } from '../session/session.module';
import { GatewayModule } from '../gateway/gateway.module';
import { CandidatePoolService } from './candidate-pool.service';
import { MatcherWorker } from './matcher.worker';
import { MatchmakingService } from './matchmaking.service';
import { ProposalService } from './proposal.service';
import { ProposalTimeoutService } from './proposal-timeout.service';
import { SearchQueueService } from './search-queue.service';

@Module({
  imports: [SessionModule, forwardRef(() => GatewayModule)],
  providers: [
    SearchQueueService,
    CandidatePoolService,
    ProposalService,
    MatchmakingService,
    MatcherWorker,
    ProposalTimeoutService,
  ],
  exports: [MatchmakingService, ProposalService],
})
export class MatchmakingModule {}
