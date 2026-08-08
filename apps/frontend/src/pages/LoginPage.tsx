import { FormEvent, useState } from 'react';
import {
  DesiredGender,
  Gender,
  PartnerFilters,
  UserProfile,
} from '@chat/shared';
import styled from 'styled-components';
import { useSocket } from '../hooks/useSocket';
import { useAppStore } from '../store/useAppStore';

const Page = styled.main`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`;

const Card = styled.form`
  width: 100%;
  max-width: 28rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: #fff;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.5rem;
`;

const Fieldset = styled.fieldset`
  border: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const Legend = styled.legend`
  font-weight: 600;
  margin-bottom: 0.5rem;
  padding: 0;
`;

const Label = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
`;

const Input = styled.input`
  padding: 0.5rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
  font-size: 1rem;
`;

const Select = styled.select`
  padding: 0.5rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
  font-size: 1rem;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
`;

const Button = styled.button`
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

const Status = styled.p<{ $variant?: 'error' | 'muted' }>`
  margin: 0;
  font-size: 0.875rem;
  color: ${({ $variant }) =>
    $variant === 'error' ? '#dc2626' : $variant === 'muted' ? '#64748b' : '#0f172a'};
`;

export function LoginPage() {
  const { connectionStatus, initSession } = useSocket();
  const setSession = useAppStore((s) => s.setSession);
  const sessionId = useAppStore((s) => s.sessionId);
  const profile = useAppStore((s) => s.profile);
  const filters = useAppStore((s) => s.filters);
  const isEditing = Boolean(profile && filters);

  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [gender, setGender] = useState<Gender>(profile?.gender ?? Gender.Male);
  const [age, setAge] = useState(profile ? String(profile.age) : '25');
  const [desiredGender, setDesiredGender] = useState<DesiredGender>(
    filters?.desiredGender ?? DesiredGender.Any,
  );
  const [ageFrom, setAgeFrom] = useState(
    filters ? String(filters.ageFrom) : '18',
  );
  const [ageTo, setAgeTo] = useState(filters ? String(filters.ageTo) : '99');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isConnected =
    connectionStatus === 'connected' || connectionStatus === 'ready';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const profile: UserProfile = {
      nickname: nickname.trim(),
      gender,
      age: Number(age),
    };

    const filters: PartnerFilters = {
      desiredGender,
      ageFrom: Number(ageFrom),
      ageTo: Number(ageTo),
    };

    try {
      const result = await initSession({ profile, filters });
      setSession(result.sessionId, profile, filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page>
      <Card onSubmit={handleSubmit}>
        <Title>{isEditing ? 'Параметры поиска' : 'Вход в чат'}</Title>
        <Status $variant="muted">
          Соединение:{' '}
          {connectionStatus === 'connecting'
            ? 'подключение…'
            : isConnected
              ? 'онлайн'
              : 'офлайн'}
        </Status>

        <Fieldset>
          <Legend>О вас</Legend>
          <Label>
            Никнейм
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              minLength={2}
              maxLength={32}
              required
            />
          </Label>
          <Row>
            <Label>
              Пол
              <Select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
              >
                <option value={Gender.Male}>М</option>
                <option value={Gender.Female}>Ж</option>
              </Select>
            </Label>
            <Label>
              Возраст
              <Input
                type="number"
                min={18}
                max={99}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
              />
            </Label>
          </Row>
        </Fieldset>

        <Fieldset>
          <Legend>Критерии собеседника</Legend>
          <Label>
            Желаемый пол
            <Select
              value={desiredGender}
              onChange={(e) =>
                setDesiredGender(e.target.value as DesiredGender)
              }
            >
              <option value={DesiredGender.Any}>Любой</option>
              <option value={DesiredGender.Male}>М</option>
              <option value={DesiredGender.Female}>Ж</option>
            </Select>
          </Label>
          <Row>
            <Label>
              Возраст от
              <Input
                type="number"
                min={18}
                max={99}
                value={ageFrom}
                onChange={(e) => setAgeFrom(e.target.value)}
                required
              />
            </Label>
            <Label>
              Возраст до
              <Input
                type="number"
                min={18}
                max={99}
                value={ageTo}
                onChange={(e) => setAgeTo(e.target.value)}
                required
              />
            </Label>
          </Row>
        </Fieldset>

        {error && <Status $variant="error">{error}</Status>}
        {sessionId && (
          <Status>Сессия активна: {sessionId.slice(0, 8)}…</Status>
        )}

        <Button type="submit" disabled={!isConnected || loading}>
          {loading
            ? isEditing
              ? 'Сохранение…'
              : 'Вход…'
            : isEditing
              ? 'Сохранить'
              : 'Войти'}
        </Button>
      </Card>
    </Page>
  );
}
