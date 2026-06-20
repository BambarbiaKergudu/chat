import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ClientEvents, ServerEvents } from '@chat/shared';
import { Server, Socket } from 'socket.io';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { MatchRespondDto } from '../matchmaking/matchmaking.dto';
import { PresenceService } from '../presence/presence.service';
import { SessionInitDto } from '../session/session.dto';
import { SessionService } from '../session/session.service';
import { WsEmitterService } from './ws-emitter.service';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
)
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly sessionService: SessionService,
    private readonly presenceService: PresenceService,
    private readonly matchmakingService: MatchmakingService,
    private readonly wsEmitter: WsEmitterService,
  ) {}

  afterInit(server: Server) {
    this.wsEmitter.setServer(server);
    this.logger.log('WebSocket gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Socket connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Socket disconnected: ${client.id}`);
    await this.presenceService.handleDisconnect(client.id);
  }

  @SubscribeMessage(ClientEvents.SessionInit)
  async handleSessionInit(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SessionInitDto,
  ) {
    this.sessionService.validateInitPayload(payload);
    const result = await this.sessionService.initSession(client.id, payload);
    client.emit(ServerEvents.SessionReady, result);
    return result;
  }

  @SubscribeMessage(ClientEvents.SearchStart)
  async handleSearchStart(@ConnectedSocket() client: Socket) {
    return this.matchmakingService.startSearch(client.id);
  }

  @SubscribeMessage(ClientEvents.SearchStop)
  async handleSearchStop(@ConnectedSocket() client: Socket) {
    await this.matchmakingService.stopSearch(client.id);
    return { stopped: true };
  }

  @SubscribeMessage(ClientEvents.MatchRespond)
  async handleMatchRespond(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: MatchRespondDto,
  ) {
    return this.matchmakingService.respondToProposal(client.id, payload.accept);
  }
}
