export enum Gender {
  Male = 'M',
  Female = 'F',
}

export enum DesiredGender {
  Male = 'M',
  Female = 'F',
  Any = 'any',
}

export enum UserStatus {
  Idle = 'IDLE',
  Searching = 'SEARCHING',
  Proposed = 'PROPOSED',
  InChat = 'IN_CHAT',
}

export interface UserProfile {
  nickname: string;
  gender: Gender;
  age: number;
}

export interface PartnerFilters {
  desiredGender: DesiredGender;
  ageFrom: number;
  ageTo: number;
}

export interface SessionInitPayload {
  profile: UserProfile;
  filters: PartnerFilters;
}

export interface PeerInfo {
  nickname: string;
  gender: Gender;
  age: number;
}
