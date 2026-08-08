import { useEffect, useState } from 'react';
import { loadSessionCredentials } from '../lib/sessionPersistence';
import { useAppStore } from '../store/useAppStore';
import { getSharedSocket, useSocket } from './useSocket';

/**
 * Persist credentials are written in setSession.
 * After reload / socket reconnect, re-emit session:init automatically.
 */
export function useSessionReconnect() {
  const { initSession } = useSocket();
  const setSession = useAppStore((s) => s.setSession);
  const sessionId = useAppStore((s) => s.sessionId);
  const [restoring, setRestoring] = useState(
    () => Boolean(loadSessionCredentials()),
  );

  useEffect(() => {
    const credentials = loadSessionCredentials();
    if (!credentials) {
      setRestoring(false);
      return;
    }

    const socket = getSharedSocket();
    let cancelled = false;
    let inFlight = false;

    const restore = () => {
      if (cancelled || inFlight) {
        return;
      }
      if (useAppStore.getState().sessionId) {
        setRestoring(false);
        return;
      }

      inFlight = true;
      setRestoring(true);

      void initSession({
        profile: credentials.profile,
        filters: credentials.filters,
      })
        .then((result) => {
          if (cancelled) {
            return;
          }
          setSession(
            result.sessionId,
            credentials.profile,
            credentials.filters,
          );
        })
        .catch((error: unknown) => {
          console.error('Session restore failed', error);
        })
        .finally(() => {
          inFlight = false;
          if (!cancelled) {
            setRestoring(false);
          }
        });
    };

    if (socket.connected) {
      restore();
    } else {
      socket.connect();
    }

    socket.on('connect', restore);

    return () => {
      cancelled = true;
      socket.off('connect', restore);
    };
  }, [initSession, setSession]);

  useEffect(() => {
    if (sessionId) {
      setRestoring(false);
    }
  }, [sessionId]);

  return { restoring };
}
