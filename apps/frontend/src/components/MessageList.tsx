import { ChatMessage } from '@chat/shared';
import { useEffect, useRef } from 'react';
import styled from 'styled-components';

const List = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 0.5rem;
`;

const Bubble = styled.div<{ $own: boolean }>`
  align-self: ${({ $own }) => ($own ? 'flex-end' : 'flex-start')};
  max-width: 80%;
  padding: 0.625rem 0.875rem;
  border-radius: 0.75rem;
  background: ${({ $own }) => ($own ? '#2563eb' : '#e2e8f0')};
  color: ${({ $own }) => ($own ? '#fff' : '#0f172a')};
  white-space: pre-wrap;
  word-break: break-word;
  flex-shrink: 0;
`;

const Empty = styled.p`
  margin: auto;
  color: #94a3b8;
  text-align: center;
`;

interface MessageListProps {
  messages: ChatMessage[];
  sessionId: string;
}

export function MessageList({ messages, sessionId }: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }
    list.scrollTop = list.scrollHeight;
  }, [messages]);

  return (
    <List ref={listRef}>
      {messages.length === 0 && (
        <Empty>Напишите первое сообщение</Empty>
      )}
      {messages.map((message) => (
        <Bubble key={message.id} $own={message.senderId === sessionId}>
          {message.text}
        </Bubble>
      ))}
    </List>
  );
}
