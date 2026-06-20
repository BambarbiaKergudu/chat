import { IsBoolean } from 'class-validator';
import { MatchRespondPayload } from '@chat/shared';

export class MatchRespondDto implements MatchRespondPayload {
  @IsBoolean()
  accept!: boolean;
}
