import { Module, forwardRef } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { GatewayModule } from '../gateway/gateway.module';
import { MatchmakingModule } from '../matchmaking/matchmaking.module';
import { SessionModule } from '../session/session.module';
import { PresenceService } from './presence.service';

@Module({
  imports: [
    SessionModule,
    forwardRef(() => MatchmakingModule),
    forwardRef(() => ChatModule),
    forwardRef(() => GatewayModule),
  ],
  providers: [PresenceService],
  exports: [PresenceService],
})
export class PresenceModule {}
