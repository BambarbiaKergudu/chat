import { useEffect, useRef, useState } from 'react';
import {
  ClientEvents,
  DesiredGender,
  Gender,
  ServerEvents,
  SessionInitPayload,
  SessionReadyPayload,
} from '@chat/shared';
import { io, Socket } from 'socket.io-client';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'ready';

let sharedSocket: Socket | null = null;

export function getSharedSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io({
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return sharedSocket;
}

export function useSocket() {
  const socketRef = useRef(getSharedSocket());
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('disconnected');

  useEffect(() => {
    const socket = socketRef.current;

    const onConnect = () => setConnectionStatus('connected');
    const onDisconnect = () => setConnectionStatus('disconnected');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (!socket.connected) {
      setConnectionStatus('connecting');
      socket.connect();
    } else {
      setConnectionStatus('connected');
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const initSession = (payload: SessionInitPayload): Promise<SessionReadyPayload> => {
    const socket = socketRef.current;

    return new Promise((resolve, reject) => {
      if (!socket.connected) {
        reject(new Error('Socket is not connected'));
        return;
      }

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
    });
  };

  const startSearch = () => {
    socketRef.current.emit(ClientEvents.SearchStart);
  };

  const stopSearch = () => {
    socketRef.current.emit(ClientEvents.SearchStop);
  };

  const respondToProposal = (accept: boolean) => {
    socketRef.current.emit(ClientEvents.MatchRespond, { accept });
  };

  return {
    socket: socketRef.current,
    connectionStatus,
    initSession,
    startSearch,
    stopSearch,
    respondToProposal,
    Gender,
    DesiredGender,
  };
}
