import { IsString, MaxLength, MinLength } from 'class-validator';
import { ChatMessagePayload } from '@chat/shared';

export const MAX_CHAT_MESSAGE_LENGTH = 1000;

export class ChatMessageDto implements ChatMessagePayload {
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_CHAT_MESSAGE_LENGTH)
  text!: string;
}
