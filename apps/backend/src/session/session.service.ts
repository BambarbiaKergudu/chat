import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  SessionInitPayload,
  SessionReadyPayload,
  UserStatus,
} from '@chat/shared';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { RedisKeys, RedisSessionData } from '../redis/redis.keys';
import { RedisService } from '../redis/redis.service';
import { assertValidAgeRange } from './session.dto';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async initSession(
    socketId: string,
    payload: SessionInitPayload,
  ): Promise<SessionReadyPayload> {
    assertValidAgeRange(payload.filters);

    const existingSessionId = await this.redis.get(
      RedisKeys.socketToSession(socketId),
    );
    if (existingSessionId) {
      await this.cleanupSession(existingSessionId, socketId);
    }

    const user = await this.prisma.user.create({
      data: {
        nickname: payload.profile.nickname.trim(),
        gender: payload.profile.gender,
        age: payload.profile.age,
      },
    });

    const sessionId = randomUUID();

    await this.prisma.userSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        socketId,
      },
    });

    const sessionData: RedisSessionData = {
      sessionId,
      userId: user.id,
      socketId,
      status: UserStatus.Idle,
      nickname: payload.profile.nickname.trim(),
      gender: payload.profile.gender,
      age: String(payload.profile.age),
      desiredGender: payload.filters.desiredGender,
      ageFrom: String(payload.filters.ageFrom),
      ageTo: String(payload.filters.ageTo),
    };

    await this.redis.hset(
      RedisKeys.session(sessionId),
      sessionData as unknown as Record<string, string>,
    );
    await this.redis.set(RedisKeys.socketToSession(socketId), sessionId);
    await this.redis.sadd(RedisKeys.idlePool, sessionId);

    this.logger.log(`Session initialized: ${sessionId} (socket ${socketId})`);

    return { sessionId };
  }

  async getSessionBySocketId(
    socketId: string,
  ): Promise<RedisSessionData | null> {
    const sessionId = await this.redis.get(RedisKeys.socketToSession(socketId));
    if (!sessionId) {
      return null;
    }
    return this.getSession(sessionId);
  }

  async getSession(sessionId: string): Promise<RedisSessionData | null> {
    const data = await this.redis.hgetall(RedisKeys.session(sessionId));
    if (!data.sessionId) {
      return null;
    }
    return data as unknown as RedisSessionData;
  }

  async updateStatus(sessionId: string, status: UserStatus): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    await this.redis.hset(RedisKeys.session(sessionId), { status });

    if (status === UserStatus.Idle) {
      await this.redis.sadd(RedisKeys.idlePool, sessionId);
    } else {
      await this.redis.srem(RedisKeys.idlePool, sessionId);
    }
  }

  async cleanupSession(
    sessionId: string,
    socketId: string,
  ): Promise<RedisSessionData | null> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    await this.redis.srem(RedisKeys.searchQueue, sessionId);
    await this.redis.srem(RedisKeys.idlePool, sessionId);
    await this.redis.srem(RedisKeys.proposedActive, sessionId);
    await this.redis.del(
      RedisKeys.session(sessionId),
      RedisKeys.socketToSession(socketId),
      RedisKeys.proposal(sessionId),
      RedisKeys.searchPending(sessionId),
    );

    await this.prisma.userSession.updateMany({
      where: { id: sessionId, disconnectedAt: null },
      data: { disconnectedAt: new Date() },
    });

    this.logger.log(`Session cleaned up: ${sessionId}`);
    return session;
  }

  async handleReconnectInit(
    socketId: string,
    payload: SessionInitPayload,
  ): Promise<SessionReadyPayload> {
    return this.initSession(socketId, payload);
  }

  validateInitPayload(payload: SessionInitPayload): void {
    try {
      assertValidAgeRange(payload.filters);
    } catch {
      throw new BadRequestException('ageFrom must be less than or equal to ageTo');
    }

    if (payload.profile.nickname.trim().length < 2) {
      throw new BadRequestException('nickname is too short');
    }
  }
}
