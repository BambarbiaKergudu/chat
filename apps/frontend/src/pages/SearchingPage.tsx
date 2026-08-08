import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Page = styled.main`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
`;

const Spinner = styled.div`
  width: 3rem;
  height: 3rem;
  border: 4px solid #e2e8f0;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.5rem;
`;

const Text = styled.p`
  margin: 0;
  color: #64748b;
  text-align: center;
`;

export function SearchingPage() {
  return (
    <Page data-testid="searching-page">
      <Spinner />
      <Title>Идёт поиск собеседника…</Title>
      <Text>Ожидайте — мы подберём подходящего человека по вашим фильтрам.</Text>
    </Page>
  );
}
