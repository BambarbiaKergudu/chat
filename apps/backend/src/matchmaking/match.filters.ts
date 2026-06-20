import { DesiredGender, Gender, PeerInfo } from '@chat/shared';
import { RedisSessionData } from '../redis/redis.keys';

function parseAge(session: RedisSessionData): number {
  return Number(session.age);
}

function matchesGender(
  targetGender: string,
  desiredGender: string,
): boolean {
  if (desiredGender === DesiredGender.Any) {
    return true;
  }
  return targetGender === desiredGender;
}

function matchesAgeRange(age: number, ageFrom: string, ageTo: string): boolean {
  return age >= Number(ageFrom) && age <= Number(ageTo);
}

export function areMutualMatch(
  initiator: RedisSessionData,
  candidate: RedisSessionData,
): boolean {
  const initiatorAge = parseAge(initiator);
  const candidateAge = parseAge(candidate);

  return (
    matchesGender(candidate.gender, initiator.desiredGender) &&
    matchesAgeRange(candidateAge, initiator.ageFrom, initiator.ageTo) &&
    matchesGender(initiator.gender, candidate.desiredGender) &&
    matchesAgeRange(initiatorAge, candidate.ageFrom, candidate.ageTo)
  );
}

export function toPeerInfo(session: RedisSessionData): PeerInfo {
  return {
    nickname: session.nickname,
    gender: session.gender as Gender,
    age: parseAge(session),
  };
}
