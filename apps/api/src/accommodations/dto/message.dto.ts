import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const MESSAGE_CHANNELS = [
  'NOTE',
  'WHATSAPP',
  'SMS',
  'EMAIL',
  'PLATFORM',
] as const;

export class CreateMessageDto {
  @ApiProperty({ example: 'سلام، ساعت ورود ۱۵:۰۰ است.' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string;

  @ApiPropertyOptional({ enum: MESSAGE_CHANNELS, default: 'NOTE' })
  @IsOptional()
  @IsIn(MESSAGE_CHANNELS as unknown as string[])
  channel?: string;

  @ApiPropertyOptional({ enum: ['IN', 'OUT'], default: 'OUT' })
  @IsOptional()
  @IsIn(['IN', 'OUT'])
  direction?: string;
}
