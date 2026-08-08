import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class WsEmitterService {
  private server: Server | null = null;

  setServer(server: Server): void {
    this.server = server;
  }

  isSocketConnected(socketId: string): boolean {
    return Boolean(this.server?.sockets.sockets.get(socketId));
  }

  emitToSocket(socketId: string, event: string, payload: unknown): void {
    this.server?.to(socketId).emit(event, payload);
  }
}
