import { useEffect } from 'react';
import {
  MatchConnectedPayload,
  MatchProposalPayload,
  SearchStatusPayload,
  ServerEvents,
} from '@chat/shared';
import { useAppStore } from '../store/useAppStore';
import { getSharedSocket } from './useSocket';

export function useMatchmakingEvents() {
  const setScreen = useAppStore((s) => s.setScreen);
  const setProposal = useAppStore((s) => s.setProposal);
  const setRoom = useAppStore((s) => s.setRoom);

  useEffect(() => {
    const socket = getSharedSocket();

    const onSearchStatus = (_payload: SearchStatusPayload) => {
      setScreen('searching');
    };

    const onMatchProposal = (payload: MatchProposalPayload) => {
      setProposal(payload);
    };

    const onMatchConnected = (payload: MatchConnectedPayload) => {
      setRoom(payload);
      setScreen('chat');
    };

    socket.on(ServerEvents.SearchStatus, onSearchStatus);
    socket.on(ServerEvents.MatchProposal, onMatchProposal);
    socket.on(ServerEvents.MatchConnected, onMatchConnected);

    return () => {
      socket.off(ServerEvents.SearchStatus, onSearchStatus);
      socket.off(ServerEvents.MatchProposal, onMatchProposal);
      socket.off(ServerEvents.MatchConnected, onMatchConnected);
    };
  }, [setScreen, setProposal, setRoom]);
}
