import { useEffect, useState } from 'react';
import { Gender, MatchProposalPayload } from '@chat/shared';
import styled from 'styled-components';
import { useSocket } from '../hooks/useSocket';
import { useAppStore } from '../store/useAppStore';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 100;
`;

const Modal = styled.div`
  width: 100%;
  max-width: 24rem;
  background: #fff;
  border-radius: 0.75rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.25rem;
`;

const Timer = styled.div`
  font-size: 2rem;
  font-weight: 700;
  text-align: center;
  color: #2563eb;
`;

const Actions = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
`;

const Button = styled.button<{ $primary?: boolean }>`
  padding: 0.75rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  background: ${({ $primary }) => ($primary ? '#2563eb' : '#e2e8f0')};
  color: ${({ $primary }) => ($primary ? '#fff' : '#0f172a')};

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

function genderLabel(gender: Gender): string {
  return gender === Gender.Male ? 'М' : 'Ж';
}

interface ProposalModalProps {
  proposal: MatchProposalPayload;
}

export function ProposalModal({ proposal }: ProposalModalProps) {
  const { respondToProposal } = useSocket();
  const setProposal = useAppStore((s) => s.setProposal);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(proposal.expiresAt).getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(remaining);

      if (remaining === 0) {
        setProposal(null);
      }
    };

    updateTimer();
    const interval = window.setInterval(updateTimer, 200);

    return () => window.clearInterval(interval);
  }, [proposal.expiresAt, setProposal]);

  async function respond(accept: boolean) {
    setLoading(true);
    respondToProposal(accept);
    if (!accept) {
      setProposal(null);
    }
    setLoading(false);
  }

  if (secondsLeft === 0) {
    return null;
  }

  return (
    <Overlay>
      <Modal>
        <Title>С вами хотят пообщаться</Title>
        <p>
          {proposal.initiator.nickname}, {genderLabel(proposal.initiator.gender)},{' '}
          {proposal.initiator.age}
        </p>
        <Timer>{secondsLeft}</Timer>
        <Actions>
          <Button type="button" disabled={loading} onClick={() => respond(false)}>
            Нет
          </Button>
          <Button
            type="button"
            $primary
            disabled={loading}
            onClick={() => respond(true)}
          >
            Да
          </Button>
        </Actions>
      </Modal>
    </Overlay>
  );
}
