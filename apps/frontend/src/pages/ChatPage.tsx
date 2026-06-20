import { Gender } from '@chat/shared';
import styled from 'styled-components';
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

function genderLabel(gender: Gender): string {
  return gender === Gender.Male ? 'М' : 'Ж';
}

export function ChatPage() {
  const room = useAppStore((s) => s.room);

  if (!room) {
    return null;
  }

  return (
    <Page>
      <Title>Чат с {room.peer.nickname}</Title>
      <Text>
        {room.peer.nickname}, {genderLabel(room.peer.gender)}, {room.peer.age}
      </Text>
      <Text>Комната {room.roomId.slice(0, 8)}… — сообщения на этапе 4.</Text>
    </Page>
  );
}
