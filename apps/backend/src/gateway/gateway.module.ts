import { Module, forwardRef } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { PresenceModule } from '../presence/presence.module';
import { SessionModule } from '../session/session.module';
import { MatchmakingModule } from '../matchmaking/matchmaking.module';
import { ChatGateway } from './chat.gateway';
import { WsEmitterService } from './ws-emitter.service';

@Module({
  imports: [
    SessionModule,
    forwardRef(() => PresenceModule),
    forwardRef(() => MatchmakingModule),
    forwardRef(() => ChatModule),
  ],
  providers: [ChatGateway, WsEmitterService],
  exports: [WsEmitterService],
})
export class GatewayModule {}
