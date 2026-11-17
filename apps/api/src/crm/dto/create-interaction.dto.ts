import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const INTERACTION_KINDS = ['NOTE', 'CALL', 'MESSAGE', 'BOOKING'] as const;

export class CreateInteractionDto {
  @ApiPropertyOptional({ enum: INTERACTION_KINDS, default: 'NOTE' })
  @IsOptional()
  @IsIn(INTERACTION_KINDS as unknown as string[])
  kind?: string;

  @ApiPropertyOptional({ description: 'متن یادداشت/خلاصه‌ی تماس' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
