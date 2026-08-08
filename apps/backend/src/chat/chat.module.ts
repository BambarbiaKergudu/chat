import { Module, forwardRef } from '@nestjs/common';
import { GatewayModule } from '../gateway/gateway.module';
import { SessionModule } from '../session/session.module';
import { ChatService } from './chat.service';

@Module({
  imports: [SessionModule, forwardRef(() => GatewayModule)],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
