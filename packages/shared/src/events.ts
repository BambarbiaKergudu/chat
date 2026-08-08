export const ClientEvents = {
  SessionInit: 'session:init',
  SessionEditStart: 'session:edit_start',
  SearchStart: 'search:start',
  SearchStop: 'search:stop',
  MatchRespond: 'match:respond',
  ChatMessage: 'chat:message',
  ChatLeave: 'chat:leave',
} as const;

export const ServerEvents = {
  SessionReady: 'session:ready',
  SearchStatus: 'search:status',
  MatchProposal: 'match:proposal',
  MatchConnected: 'match:connected',
  ChatMessage: 'chat:message',
  ChatPeerLeft: 'chat:peer_left',
  ChatSystem: 'chat:system',
} as const;

export type ClientEventName = (typeof ClientEvents)[keyof typeof ClientEvents];
export type ServerEventName = (typeof ServerEvents)[keyof typeof ServerEvents];
