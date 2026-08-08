export const PROPOSAL_TTL_SECONDS = 7;

/** After explicit decline, do not re-propose the same pair for this long. */
export const PAIR_BLOCK_TTL_SECONDS = 20;

export interface ProposalData {
  initiatorSessionId: string;
  expiresAt: string;
}
