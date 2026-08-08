import { useEffect } from 'react';
import styled from 'styled-components';
import { ProposalModal } from '../components/ProposalModal';
import { useChatEvents } from '../hooks/useChatEvents';
import { useMatchmakingEvents } from '../hooks/useMatchmakingEvents';
import { useSessionReconnect } from '../hooks/useSessionReconnect';
import { useSocket } from '../hooks/useSocket';
import { ChatPage } from '../pages/ChatPage';
import { IdlePage } from '../pages/IdlePage';
import { LoginPage } from '../pages/LoginPage';
import { SearchingPage } from '../pages/SearchingPage';
import { useAppStore } from '../store/useAppStore';

const Notice = styled.div`
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background: #0f172a;
  color: #fff;
  font-size: 0.875rem;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.2);
`;

const ConnectionBanner = styled.div`
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  padding: 0.625rem 1rem;
  border-radius: 0.5rem;
  background: #b45309;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
`;

const RestoringPage = styled.main`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 1rem;
`;

export function App() {
  useMatchmakingEvents();
  useChatEvents();
  const { restoring } = useSessionReconnect();

  const { connectionStatus } = useSocket();
  const sessionId = useAppStore((s) => s.sessionId);
  const screen = useAppStore((s) => s.screen);
  const proposal = useAppStore((s) => s.proposal);
  const peerLeftNotice = useAppStore((s) => s.peerLeftNotice);
  const clearPeerLeftNotice = useAppStore((s) => s.clearPeerLeftNotice);

  useEffect(() => {
    if (!peerLeftNotice) {
      return;
    }
    const timer = window.setTimeout(() => {
      clearPeerLeftNotice();
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [peerLeftNotice, clearPeerLeftNotice]);

  const showConnectionBanner =
    Boolean(sessionId) &&
    (connectionStatus === 'disconnected' || connectionStatus === 'connecting');

  if (restoring && !sessionId) {
    return (
      <RestoringPage data-testid="restoring-session">
        Восстановление сессии…
      </RestoringPage>
    );
  }

  if (!sessionId || screen === 'login') {
    return (
      <>
        <LoginPage />
        {showConnectionBanner && (
          <ConnectionBanner>Восстановление соединения…</ConnectionBanner>
        )}
      </>
    );
  }

  return (
    <>
      {screen === 'searching' && <SearchingPage />}
      {screen === 'idle' && <IdlePage />}
      {screen === 'chat' && <ChatPage />}
      {proposal && <ProposalModal proposal={proposal} />}
      {peerLeftNotice && <Notice>{peerLeftNotice}</Notice>}
      {showConnectionBanner && (
        <ConnectionBanner>Восстановление соединения…</ConnectionBanner>
      )}
    </>
  );
}
