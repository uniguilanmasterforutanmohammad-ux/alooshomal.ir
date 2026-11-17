import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const CHANNEL_KINDS = ['OTA', 'DIRECT', 'SOCIAL', 'OTHER'] as const;

export class CreateChannelDto {
  @ApiProperty({ example: 'جاباما', maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ enum: CHANNEL_KINDS, default: 'OTA' })
  @IsOptional()
  @IsIn(CHANNEL_KINDS as unknown as string[])
  kind?: string;

  @ApiPropertyOptional({ example: 'https://www.jabama.com/...' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  url?: string;

  @ApiPropertyOptional({
    description:
      'آدرس فید iCal کانال (مثلاً از بوکینگ/ایربن‌بی) برای همگام‌سازی تقویم',
    example: 'https://ical.booking.com/v1/export?t=...',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  icalUrl?: string;

  @ApiPropertyOptional({ description: 'شناسه/نام حساب در آن پلتفرم' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  accountRef?: string;

  @ApiPropertyOptional({ description: 'یادداشت داخلی' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
