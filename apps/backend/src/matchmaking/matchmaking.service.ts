import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  SearchStatusPayload,
  ServerEvents,
  UserStatus,
} from '@chat/shared';
import { WsEmitterService } from '../gateway/ws-emitter.service';
import { SessionService } from '../session/session.service';
import { toUserStatus } from '../session/session.dto';
import { ProposalService } from './proposal.service';
import { SearchQueueService } from './search-queue.service';

@Injectable()
export class MatchmakingService {
  constructor(
    private readonly sessionService: SessionService,
    private readonly searchQueue: SearchQueueService,
    private readonly proposalService: ProposalService,
    private readonly wsEmitter: WsEmitterService,
  ) {}

  async startSearch(socketId: string): Promise<SearchStatusPayload> {
    const session = await this.sessionService.getSessionBySocketId(socketId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const status = toUserStatus(session.status);
    if (status === UserStatus.Searching) {
      return { status: 'searching' };
    }

    if (status !== UserStatus.Idle) {
      throw new ConflictException(`Cannot search while in status ${status}`);
    }

    await this.sessionService.updateStatus(session.sessionId, UserStatus.Searching);
    await this.searchQueue.add(session.sessionId);

    const payload: SearchStatusPayload = { status: 'searching' };
    this.wsEmitter.emitToSocket(
      socketId,
      ServerEvents.SearchStatus,
      payload,
    );

    return payload;
  }

  async stopSearch(socketId: string): Promise<void> {
    const session = await this.sessionService.getSessionBySocketId(socketId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (toUserStatus(session.status) !== UserStatus.Searching) {
      return;
    }

    await this.searchQueue.remove(session.sessionId);
    await this.sessionService.updateStatus(session.sessionId, UserStatus.Idle);
  }

  async respondToProposal(
    socketId: string,
    accept: boolean,
  ): Promise<{ accepted: boolean }> {
    const session = await this.sessionService.getSessionBySocketId(socketId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (toUserStatus(session.status) !== UserStatus.Proposed) {
      throw new BadRequestException('No active proposal');
    }

    const proposal = await this.proposalService.getProposal(session.sessionId);
    if (!proposal) {
      await this.proposalService.expireProposal(session.sessionId);
      throw new BadRequestException('Proposal expired');
    }

    if (new Date(proposal.expiresAt).getTime() < Date.now()) {
      await this.proposalService.expireProposal(session.sessionId);
      throw new BadRequestException('Proposal expired');
    }

    if (!accept) {
      await this.proposalService.declineProposal(session.sessionId);
      return { accepted: false };
    }

    const result = await this.proposalService.acceptProposal(session.sessionId);
    if (!result) {
      throw new BadRequestException('Proposal is no longer valid');
    }

    return { accepted: true };
  }
}
