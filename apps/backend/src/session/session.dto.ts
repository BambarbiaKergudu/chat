import {
  DesiredGender,
  Gender,
  PartnerFilters,
  SessionInitPayload,
  UserProfile,
  UserStatus,
} from '@chat/shared';
import {
  IsEnum,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UserProfileDto implements UserProfile {
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  nickname!: string;

  @IsEnum(Gender)
  gender!: Gender;

  @IsInt()
  @Min(18)
  @Max(99)
  age!: number;
}

export class PartnerFiltersDto implements PartnerFilters {
  @IsEnum(DesiredGender)
  desiredGender!: DesiredGender;

  @IsInt()
  @Min(18)
  @Max(99)
  ageFrom!: number;

  @IsInt()
  @Min(18)
  @Max(99)
  ageTo!: number;
}

export class SessionInitDto implements SessionInitPayload {
  @ValidateNested()
  @Type(() => UserProfileDto)
  profile!: UserProfileDto;

  @ValidateNested()
  @Type(() => PartnerFiltersDto)
  filters!: PartnerFiltersDto;
}

export function assertValidAgeRange(filters: PartnerFilters): void {
  if (filters.ageFrom > filters.ageTo) {
    throw new Error('ageFrom must be less than or equal to ageTo');
  }
}

export function toUserStatus(value: string): UserStatus {
  if (Object.values(UserStatus).includes(value as UserStatus)) {
    return value as UserStatus;
  }
  return UserStatus.Idle;
}
