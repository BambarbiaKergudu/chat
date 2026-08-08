import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import {
  ChatEndReason,
  ChatMessage,
  ChatPeerLeftPayload,
  ServerEvents,
  UserStatus,
} from '@chat/shared';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { WsEmitterService } from '../gateway/ws-emitter.service';
import { RedisKeys, RedisRoomData, RedisSessionData } from '../redis/redis.keys';
import { RedisService } from '../redis/redis.service';
import { toUserStatus } from '../session/session.dto';
import { SessionService } from '../session/session.service';
import { MAX_CHAT_MESSAGE_LENGTH } from './chat.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    @Inject(forwardRef(() => WsEmitterService))
    private readonly wsEmitter: WsEmitterService,
  ) {}

  async createRoom(
    initiator: RedisSessionData,
    candidate: RedisSessionData,
  ): Promise<string> {
    const roomId = randomUUID();

    await this.prisma.chatRoom.create({
      data: {
        id: roomId,
        userAId: initiator.userId,
        userBId: candidate.userId,
      },
    });

    const roomData: RedisRoomData = {
      roomId,
      sessionAId: initiator.sessionId,
      sessionBId: candidate.sessionId,
      userAId: initiator.userId,
      userBId: candidate.userId,
      socketAId: initiator.socketId,
      socketBId: candidate.socketId,
    };

    await this.redis.hset(
      RedisKeys.room(roomId),
      roomData as unknown as Record<string, string>,
    );
    await this.redis.set(
      RedisKeys.sessionRoom(initiator.sessionId),
      roomId,
    );
    await this.redis.set(
      RedisKeys.sessionRoom(candidate.sessionId),
      roomId,
    );

    this.logger.log(
      `Room created: ${roomId} (${initiator.sessionId} + ${candidate.sessionId})`,
    );

    return roomId;
  }

  async sendMessage(
    socketId: string,
    text: string,
  ): Promise<ChatMessage | null> {
    const session = await this.sessionService.getSessionBySocketId(socketId);
    if (!session || toUserStatus(session.status) !== UserStatus.InChat) {
      return null;
    }

    const trimmed = text.trim();
    if (!trimmed || trimmed.length > MAX_CHAT_MESSAGE_LENGTH) {
      return null;
    }

    const room = await this.getRoomBySessionId(session.sessionId);
    if (!room) {
      return null;
    }

    const message: ChatMessage = {
      id: randomUUID(),
      senderId: session.sessionId,
      text: trimmed,
      createdAt: new Date().toISOString(),
    };

    this.wsEmitter.emitToSocket(
      room.socketAId,
      ServerEvents.ChatMessage,
      message,
    );
    this.wsEmitter.emitToSocket(
      room.socketBId,
      ServerEvents.ChatMessage,
      message,
    );

    void this.prisma.message
      .create({
        data: {
          id: message.id,
          roomId: room.roomId,
          senderId: session.userId,
          text: trimmed,
          createdAt: new Date(message.createdAt),
        },
      })
      .catch((error: Error) => {
        this.logger.error(
          `Failed to persist message ${message.id}: ${error.message}`,
        );
      });

    return message;
  }

  async leaveBySocket(
    socketId: string,
    reason: ChatEndReason,
  ): Promise<boolean> {
    const session = await this.sessionService.getSessionBySocketId(socketId);
    if (!session) {
      return false;
    }
    return this.teardownRoomForSession(session.sessionId, reason);
  }

  async leaveBySession(
    sessionId: string,
    reason: ChatEndReason,
  ): Promise<boolean> {
    return this.teardownRoomForSession(sessionId, reason);
  }

  private async teardownRoomForSession(
    sessionId: string,
    reason: ChatEndReason,
  ): Promise<boolean> {
    const room = await this.getRoomBySessionId(sessionId);
    if (!room) {
      return false;
    }

    const isSessionA = room.sessionAId === sessionId;
    const peerSessionId = isSessionA ? room.sessionBId : room.sessionAId;
    const peerSocketId = isSessionA ? room.socketBId : room.socketAId;

    const payload: ChatPeerLeftPayload = { reason };
    this.wsEmitter.emitToSocket(
      peerSocketId,
      ServerEvents.ChatPeerLeft,
      payload,
    );

    await this.redis.del(
      RedisKeys.room(room.roomId),
      RedisKeys.sessionRoom(room.sessionAId),
      RedisKeys.sessionRoom(room.sessionBId),
    );

    void this.prisma.chatRoom
      .update({
        where: { id: room.roomId },
        data: {
          endedAt: new Date(),
          endReason: reason,
        },
      })
      .catch((error: Error) => {
        this.logger.error(
          `Failed to end room ${room.roomId}: ${error.message}`,
        );
      });

    const peer = await this.sessionService.getSession(peerSessionId);
    if (peer && toUserStatus(peer.status) === UserStatus.InChat) {
      await this.sessionService.updateStatus(peerSessionId, UserStatus.Idle);
    }

    if (reason === 'leave') {
      const leaver = await this.sessionService.getSession(sessionId);
      if (leaver && toUserStatus(leaver.status) === UserStatus.InChat) {
        await this.sessionService.updateStatus(sessionId, UserStatus.Idle);
      }
    }

    this.logger.log(
      `Room ${room.roomId} ended (${reason}) by session ${sessionId}`,
    );

    return true;
  }

  private async getRoomBySessionId(
    sessionId: string,
  ): Promise<RedisRoomData | null> {
    const roomId = await this.redis.get(RedisKeys.sessionRoom(sessionId));
    if (!roomId) {
      return null;
    }
    return this.getRoom(roomId);
  }

  private async getRoom(roomId: string): Promise<RedisRoomData | null> {
    const data = await this.redis.hgetall(RedisKeys.room(roomId));
    if (!data.roomId) {
      return null;
    }
    return data as unknown as RedisRoomData;
  }
}
