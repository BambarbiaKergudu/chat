import type {
  ChatMessage,
  MatchConnectedPayload,
  MatchProposalPayload,
  PartnerFilters,
  UserProfile,
} from '@chat/shared';
import { create } from 'zustand';
import {
  clearSessionCredentials,
  saveSessionCredentials,
} from '../lib/sessionPersistence';

export type AppScreen = 'login' | 'idle' | 'searching' | 'chat';

interface AppState {
  screen: AppScreen;
  sessionId: string | null;
  profile: UserProfile | null;
  filters: PartnerFilters | null;
  proposal: MatchProposalPayload | null;
  room: MatchConnectedPayload | null;
  messages: ChatMessage[];
  peerLeftNotice: string | null;
  setScreen: (screen: AppScreen) => void;
  setSession: (
    sessionId: string,
    profile: UserProfile,
    filters: PartnerFilters,
  ) => void;
  setProposal: (proposal: MatchProposalPayload | null) => void;
  setRoom: (room: MatchConnectedPayload | null) => void;
  addMessage: (message: ChatMessage) => void;
  leaveChat: () => void;
  handlePeerLeft: (notice: string) => void;
  clearPeerLeftNotice: () => void;
  editSearchParams: () => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  screen: 'login',
  sessionId: null,
  profile: null,
  filters: null,
  proposal: null,
  room: null,
  messages: [],
  peerLeftNotice: null,
  setScreen: (screen) => set({ screen }),
  setSession: (sessionId, profile, filters) => {
    saveSessionCredentials(profile, filters);
    set({
      sessionId,
      profile,
      filters,
      screen: 'idle',
      proposal: null,
      room: null,
      messages: [],
      peerLeftNotice: null,
    });
  },
  setProposal: (proposal) => set({ proposal }),
  setRoom: (room) =>
    set({
      room,
      proposal: null,
      messages: [],
      peerLeftNotice: null,
    }),
  addMessage: (message) =>
    set((state) => {
      if (state.messages.some((item) => item.id === message.id)) {
        return state;
      }
      return { messages: [...state.messages, message] };
    }),
  leaveChat: () =>
    set({
      screen: 'idle',
      room: null,
      messages: [],
      proposal: null,
      peerLeftNotice: null,
    }),
  handlePeerLeft: (notice) =>
    set({
      screen: 'idle',
      room: null,
      messages: [],
      proposal: null,
      peerLeftNotice: notice,
    }),
  clearPeerLeftNotice: () => set({ peerLeftNotice: null }),
  editSearchParams: () => set({ screen: 'login', proposal: null }),
  reset: () => {
    clearSessionCredentials();
    set({
      screen: 'login',
      sessionId: null,
      profile: null,
      filters: null,
      proposal: null,
      room: null,
      messages: [],
      peerLeftNotice: null,
    });
  },
}));
