import { Injectable } from '@nestjs/common';
import { RedisKeys } from '../redis/redis.keys';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class SearchQueueService {
  constructor(private readonly redis: RedisService) {}

  async add(sessionId: string): Promise<void> {
    await this.redis.sadd(RedisKeys.searchQueue, sessionId);
  }

  async remove(sessionId: string): Promise<void> {
    await this.redis.srem(RedisKeys.searchQueue, sessionId);
  }

  async getAll(): Promise<string[]> {
    return this.redis.smembers(RedisKeys.searchQueue);
  }

  async has(sessionId: string): Promise<boolean> {
    const queue = await this.getAll();
    return queue.includes(sessionId);
  }
}
