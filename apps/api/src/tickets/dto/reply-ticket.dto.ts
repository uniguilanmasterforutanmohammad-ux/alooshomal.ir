import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ReplyTicketDto {
  @ApiProperty({ example: 'پاسخ یا پیام جدید در تیکت' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;
}
