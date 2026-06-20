import type {
  MatchConnectedPayload,
  MatchProposalPayload,
  PartnerFilters,
  UserProfile,
} from '@chat/shared';
import { create } from 'zustand';

export type AppScreen = 'login' | 'idle' | 'searching' | 'chat';

interface AppState {
  screen: AppScreen;
  sessionId: string | null;
  profile: UserProfile | null;
  filters: PartnerFilters | null;
  proposal: MatchProposalPayload | null;
  room: MatchConnectedPayload | null;
  setScreen: (screen: AppScreen) => void;
  setSession: (
    sessionId: string,
    profile: UserProfile,
    filters: PartnerFilters,
  ) => void;
  setProposal: (proposal: MatchProposalPayload | null) => void;
  setRoom: (room: MatchConnectedPayload | null) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  screen: 'login',
  sessionId: null,
  profile: null,
  filters: null,
  proposal: null,
  room: null,
  setScreen: (screen) => set({ screen }),
  setSession: (sessionId, profile, filters) =>
    set({
      sessionId,
      profile,
      filters,
      screen: 'idle',
      proposal: null,
      room: null,
    }),
  setProposal: (proposal) => set({ proposal }),
  setRoom: (room) => set({ room, proposal: null }),
  reset: () =>
    set({
      screen: 'login',
      sessionId: null,
      profile: null,
      filters: null,
      proposal: null,
      room: null,
    }),
}));
