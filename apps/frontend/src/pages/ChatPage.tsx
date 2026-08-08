import { FormEvent, useState } from 'react';
import { Gender } from '@chat/shared';
import styled from 'styled-components';
import { MessageList } from '../components/MessageList';
import { useSocket } from '../hooks/useSocket';
import { useAppStore } from '../store/useAppStore';

const Page = styled.main`
  height: 100dvh;
  max-height: 100dvh;
  display: flex;
  flex-direction: column;
  max-width: 40rem;
  margin: 0 auto;
  padding: 1rem;
  gap: 0.75rem;
  overflow: hidden;
  box-sizing: border-box;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-shrink: 0;
`;

const PeerInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.25rem;
`;

const Meta = styled.p`
  margin: 0;
  color: #64748b;
  font-size: 0.875rem;
`;

const LeaveButton = styled.button`
  padding: 0.5rem 0.875rem;
  border: none;
  border-radius: 0.375rem;
  background: #e2e8f0;
  color: #0f172a;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: #cbd5e1;
  }
`;

const Composer = styled.form`
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
`;

const Input = styled.input`
  flex: 1;
  padding: 0.75rem 0.875rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
  font-size: 1rem;

  &:focus {
    outline: 2px solid #93c5fd;
    border-color: #2563eb;
  }
`;

const SendButton = styled.button`
  padding: 0.75rem 1rem;
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

function genderLabel(gender: Gender): string {
  return gender === Gender.Male ? 'М' : 'Ж';
}

export function ChatPage() {
  const room = useAppStore((s) => s.room);
  const sessionId = useAppStore((s) => s.sessionId);
  const messages = useAppStore((s) => s.messages);
  const leaveChatLocally = useAppStore((s) => s.leaveChat);
  const { sendChatMessage, leaveChat } = useSocket();
  const [text, setText] = useState('');

  if (!room || !sessionId) {
    return null;
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    sendChatMessage(trimmed);
    setText('');
  };

  const handleLeave = () => {
    leaveChat();
    leaveChatLocally();
  };

  return (
    <Page>
      <Header>
        <PeerInfo>
          <Title>{room.peer.nickname}</Title>
          <Meta>
            {genderLabel(room.peer.gender)}, {room.peer.age}
          </Meta>
        </PeerInfo>
        <LeaveButton type="button" onClick={handleLeave}>
          Покинуть чат
        </LeaveButton>
      </Header>

      <MessageList messages={messages} sessionId={sessionId} />

      <Composer onSubmit={handleSubmit}>
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Сообщение…"
          maxLength={1000}
          autoFocus
        />
        <SendButton type="submit" disabled={!text.trim()}>
          Отправить
        </SendButton>
      </Composer>
    </Page>
  );
}
