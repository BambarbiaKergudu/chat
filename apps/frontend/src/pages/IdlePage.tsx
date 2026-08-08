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

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  max-width: 16rem;
`;

const Button = styled.button<{ $secondary?: boolean }>`
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 0.375rem;
  background: ${({ $secondary }) => ($secondary ? '#e2e8f0' : '#2563eb')};
  color: ${({ $secondary }) => ($secondary ? '#0f172a' : '#fff')};
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
  const editSearchParams = useAppStore((s) => s.editSearchParams);
  const { startSearch, beginEditSearchParams } = useSocket();

  const handleEditSearchParams = () => {
    beginEditSearchParams();
    editSearchParams();
  };

  return (
    <Page data-testid="idle-page">
      <Title>Привет, {profile?.nickname}!</Title>
      <Text>Вы в сети и доступны для входящих предложений.</Text>
      <Actions>
        <Button data-testid="start-search" type="button" onClick={startSearch}>
          Начать общение
        </Button>
        <Button type="button" $secondary onClick={handleEditSearchParams}>
          Изменить параметры поиска
        </Button>
      </Actions>
    </Page>
  );
}
