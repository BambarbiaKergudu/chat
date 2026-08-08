import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ClientEvents,
  DesiredGender,
  Gender,
  ServerEvents,
  SessionInitPayload,
  SessionReadyPayload,
} from '@chat/shared';
import { io, Socket } from 'socket.io-client';

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'ready';

let sharedSocket: Socket | null = null;

export function getSharedSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io({
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
    });
  }
  return sharedSocket;
}

export function useSocket() {
  const socketRef = useRef(getSharedSocket());
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>(() =>
      socketRef.current.connected ? 'connected' : 'disconnected',
    );

  useEffect(() => {
    const socket = socketRef.current;

    const onConnect = () => setConnectionStatus('connected');
    const onDisconnect = () => setConnectionStatus('disconnected');
    const onReconnectAttempt = () => setConnectionStatus('connecting');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('reconnect_attempt', onReconnectAttempt);

    if (!socket.connected) {
      setConnectionStatus('connecting');
      socket.connect();
    } else {
      setConnectionStatus('connected');
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('reconnect_attempt', onReconnectAttempt);
    };
  }, []);

  const initSession = useCallback(
    (payload: SessionInitPayload): Promise<SessionReadyPayload> => {
      const socket = socketRef.current;

      return new Promise((resolve, reject) => {
        const start = () => {
          const timeout = window.setTimeout(() => {
            socket.off(ServerEvents.SessionReady, onReady);
            reject(new Error('Session init timeout'));
          }, 10_000);

          const onReady = (data: SessionReadyPayload) => {
            window.clearTimeout(timeout);
            socket.off(ServerEvents.SessionReady, onReady);
            setConnectionStatus('ready');
            resolve(data);
          };

          socket.once(ServerEvents.SessionReady, onReady);
          socket.emit(ClientEvents.SessionInit, payload);
        };

        if (socket.connected) {
          start();
          return;
        }

        const onConnect = () => {
          socket.off('connect', onConnect);
          start();
        };
        socket.once('connect', onConnect);
        socket.connect();
      });
    },
    [],
  );

  const startSearch = useCallback(() => {
    socketRef.current.emit(ClientEvents.SearchStart);
  }, []);

  const stopSearch = useCallback(() => {
    socketRef.current.emit(ClientEvents.SearchStop);
  }, []);

  const respondToProposal = useCallback((accept: boolean) => {
    socketRef.current.emit(ClientEvents.MatchRespond, { accept });
  }, []);

  const sendChatMessage = useCallback((text: string) => {
    socketRef.current.emit(ClientEvents.ChatMessage, { text });
  }, []);

  const leaveChat = useCallback(() => {
    socketRef.current.emit(ClientEvents.ChatLeave);
  }, []);

  const beginEditSearchParams = useCallback(() => {
    socketRef.current.emit(ClientEvents.SessionEditStart);
  }, []);

  return {
    socket: socketRef.current,
    connectionStatus,
    initSession,
    startSearch,
    stopSearch,
    respondToProposal,
    sendChatMessage,
    leaveChat,
    beginEditSearchParams,
    Gender,
    DesiredGender,
  };
}
