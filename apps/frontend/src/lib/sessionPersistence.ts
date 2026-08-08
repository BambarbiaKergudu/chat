import type { PartnerFilters, UserProfile } from '@chat/shared';

const STORAGE_KEY = 'chat.sessionCredentials';

export interface SessionCredentials {
  profile: UserProfile;
  filters: PartnerFilters;
}

export function loadSessionCredentials(): SessionCredentials | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as SessionCredentials;
  } catch {
    return null;
  }
}

export function saveSessionCredentials(
  profile: UserProfile,
  filters: PartnerFilters,
): void {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ profile, filters } satisfies SessionCredentials),
  );
}

export function clearSessionCredentials(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
