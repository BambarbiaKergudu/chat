import { useEffect } from 'react';
import {
  ChatMessage,
  ChatPeerLeftPayload,
  ServerEvents,
} from '@chat/shared';
import { useAppStore } from '../store/useAppStore';
import { getSharedSocket } from './useSocket';

export function useChatEvents() {
  const addMessage = useAppStore((s) => s.addMessage);
  const handlePeerLeft = useAppStore((s) => s.handlePeerLeft);

  useEffect(() => {
    const socket = getSharedSocket();

    const onChatMessage = (payload: ChatMessage) => {
      addMessage(payload);
    };

    const onPeerLeft = (payload: ChatPeerLeftPayload) => {
      const notice =
        payload.reason === 'disconnect'
          ? 'Собеседник отключился'
          : 'Собеседник покинул чат';
      handlePeerLeft(notice);
    };

    socket.on(ServerEvents.ChatMessage, onChatMessage);
    socket.on(ServerEvents.ChatPeerLeft, onPeerLeft);

    return () => {
      socket.off(ServerEvents.ChatMessage, onChatMessage);
      socket.off(ServerEvents.ChatPeerLeft, onPeerLeft);
    };
  }, [addMessage, handlePeerLeft]);
}
