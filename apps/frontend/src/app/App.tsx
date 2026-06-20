import { ProposalModal } from '../components/ProposalModal';
import { useMatchmakingEvents } from '../hooks/useMatchmakingEvents';
import { ChatPage } from '../pages/ChatPage';
import { IdlePage } from '../pages/IdlePage';
import { LoginPage } from '../pages/LoginPage';
import { SearchingPage } from '../pages/SearchingPage';
import { useAppStore } from '../store/useAppStore';

export function App() {
  useMatchmakingEvents();

  const sessionId = useAppStore((s) => s.sessionId);
  const screen = useAppStore((s) => s.screen);
  const proposal = useAppStore((s) => s.proposal);

  if (!sessionId) {
    return <LoginPage />;
  }

  return (
    <>
      {screen === 'searching' && <SearchingPage />}
      {screen === 'idle' && <IdlePage />}
      {screen === 'chat' && <ChatPage />}
      {proposal && <ProposalModal proposal={proposal} />}
    </>
  );
}
