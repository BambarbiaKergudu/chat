import type { Gender, PeerInfo, SessionInitPayload } from './user';

export interface RoomState {
  roomId: string;
  peer: PeerInfo;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface MatchProposalPayload {
  initiator: PeerInfo;
  expiresAt: string;
}

export interface MatchConnectedPayload {
  roomId: string;
  peer: PeerInfo;
}

export interface MatchRespondPayload {
  accept: boolean;
}

export interface ChatMessagePayload {
  text: string;
}

export type SessionInitEvent = SessionInitPayload;
export type MatchProposalEvent = MatchProposalPayload;
export type MatchConnectedEvent = MatchConnectedPayload;
export type MatchRespondEvent = MatchRespondPayload;
export type ChatMessageEvent = ChatMessagePayload;
export type ChatMessageBroadcast = ChatMessage;

export interface SearchStatusPayload {
  status: 'searching';
}

export interface SessionReadyPayload {
  sessionId: string;
}

export interface ChatSystemPayload {
  message: string;
}

export type GenderDisplay = Gender;
