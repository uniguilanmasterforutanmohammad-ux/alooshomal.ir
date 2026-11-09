import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** Turn one Zohal service on/off. */
export class ToggleZohalServiceDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  enabled!: boolean;
}

/** Body of the admin «آزمایش» call (a real, billable Zohal request). */
export class TestZohalServiceDto {
  @ApiPropertyOptional({
    type: Object,
    example: { mobile: '09121234567', national_code: '0012345679' },
    description: 'ورودی‌های سرویس؛ کلیدها همان نام فیلدهای زحل هستند.',
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

/** Approve or reject a pending blue-tick request. */
export class DecideBlueTickDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsString()
  decision!: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ example: 'اطلاعات هویتی مطابقت نداشت' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
