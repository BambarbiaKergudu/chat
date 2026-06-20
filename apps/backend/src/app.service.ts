import { Injectable } from '@nestjs/common';
import { ServerEvents } from '@chat/shared';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'chat-backend',
      wsEvents: Object.values(ServerEvents),
    };
  }
}
