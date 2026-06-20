import styled from 'styled-components';
import { useSocket } from '../hooks/useSocket';
import { useAppStore } from '../store/useAppStore';

const Page = styled.main`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
`;

const Title = styled.h1`
  margin: 0;
`;

const Text = styled.p`
  margin: 0;
  color: #64748b;
  text-align: center;
`;

const Button = styled.button`
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 0.375rem;
  background: #2563eb;
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export function IdlePage() {
  const profile = useAppStore((s) => s.profile);
  const { startSearch } = useSocket();

  return (
    <Page>
      <Title>Привет, {profile?.nickname}!</Title>
      <Text>Вы в сети и доступны для входящих предложений.</Text>
      <Button type="button" onClick={startSearch}>
        Начать общение
      </Button>
    </Page>
  );
}
