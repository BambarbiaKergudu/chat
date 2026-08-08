export const PROPOSAL_TTL_SECONDS = 7;

/** After explicit decline, do not re-propose the same pair for this long. */
export const PAIR_BLOCK_TTL_SECONDS = 20;

export const SEARCH_START_RATE_LIMIT = {
  limit: 1,
  windowSec: 3,
} as const;

export const CHAT_MESSAGE_RATE_LIMIT = {
  limit: 20,
  windowSec: 10,
} as const;

export const SESSION_INIT_RATE_LIMIT = {
  limit: 5,
  windowSec: 10,
} as const;

export interface ProposalData {
  initiatorSessionId: string;
  expiresAt: string;
}
