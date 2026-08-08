import { Injectable } from '@nestjs/common';
import { RedisKeys } from '../redis/redis.keys';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RateLimitService {
  constructor(private readonly redis: RedisService) {}

  /**
   * Returns true when the action is allowed.
   * Uses Redis INCR + EXPIRE sliding fixed window.
   */
  async allow(
    bucket: string,
    id: string,
    limit: number,
    windowSec: number,
  ): Promise<boolean> {
    const key = RedisKeys.rateLimit(bucket, id);
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, windowSec);
    }
    return count <= limit;
  }
}
