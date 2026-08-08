import { useEffect } from 'react';
import styled from 'styled-components';
import { ProposalModal } from '../components/ProposalModal';
import { useChatEvents } from '../hooks/useChatEvents';
import { useMatchmakingEvents } from '../hooks/useMatchmakingEvents';
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

export function App() {
  useMatchmakingEvents();
  useChatEvents();

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

  if (!sessionId || screen === 'login') {
    return <LoginPage />;
  }

  return (
    <>
      {screen === 'searching' && <SearchingPage />}
      {screen === 'idle' && <IdlePage />}
      {screen === 'chat' && <ChatPage />}
      {proposal && <ProposalModal proposal={proposal} />}
      {peerLeftNotice && <Notice>{peerLeftNotice}</Notice>}
    </>
  );
}
