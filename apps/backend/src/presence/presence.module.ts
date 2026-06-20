import { Module, forwardRef } from '@nestjs/common';
import { MatchmakingModule } from '../matchmaking/matchmaking.module';
import { SessionModule } from '../session/session.module';
import { PresenceService } from './presence.service';

@Module({
  imports: [SessionModule, forwardRef(() => MatchmakingModule)],
  providers: [PresenceService],
  exports: [PresenceService],
})
export class PresenceModule {}
