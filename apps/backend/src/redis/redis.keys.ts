export const RedisKeys = {
  session: (sessionId: string) => `session:${sessionId}`,
  socketToSession: (socketId: string) => `user:socket:${socketId}`,
  searchQueue: 'search:queue',
  idlePool: 'pool:idle',
  proposal: (sessionId: string) => `proposal:${sessionId}`,
  searchPending: (sessionId: string) => `search:pending:${sessionId}`,
  proposedActive: 'proposed:active',
  room: (roomId: string) => `room:${roomId}`,
  sessionRoom: (sessionId: string) => `session:room:${sessionId}`,
  matchBlock: (sessionIdA: string, sessionIdB: string) => {
    const [left, right] =
      sessionIdA < sessionIdB
        ? [sessionIdA, sessionIdB]
        : [sessionIdB, sessionIdA];
    return `match:block:${left}:${right}`;
  },
} as const;

export interface RedisSessionData {
  sessionId: string;
  userId: string;
  socketId: string;
  status: string;
  nickname: string;
  gender: string;
  age: string;
  desiredGender: string;
  ageFrom: string;
  ageTo: string;
}

export interface RedisRoomData {
  roomId: string;
  sessionAId: string;
  sessionBId: string;
  userAId: string;
  userBId: string;
  socketAId: string;
  socketBId: string;
}
