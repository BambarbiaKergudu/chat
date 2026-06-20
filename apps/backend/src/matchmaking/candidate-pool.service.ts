import { Injectable } from '@nestjs/common';
import { UserStatus } from '@chat/shared';
import { RedisKeys } from '../redis/redis.keys';
import { RedisService } from '../redis/redis.service';
import { SessionService } from '../session/session.service';
import { toUserStatus } from '../session/session.dto';

@Injectable()
export class CandidatePoolService {
  constructor(
    private readonly redis: RedisService,
    private readonly sessionService: SessionService,
  ) {}

  async getIdleSessionIds(): Promise<string[]> {
    const members = await this.redis.smembers(RedisKeys.idlePool);
    const idle: string[] = [];

    for (const sessionId of members) {
      const session = await this.sessionService.getSession(sessionId);
      if (session && toUserStatus(session.status) === UserStatus.Idle) {
        idle.push(sessionId);
      } else if (session) {
        await this.redis.srem(RedisKeys.idlePool, sessionId);
      }
    }

    return idle;
  }
}
