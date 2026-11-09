import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Turn one Zohal service on/off and/or set its per-call user price. */
export class UpdateZohalServiceDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    example: 25000,
    minimum: 0,
    description: 'هزینه‌ی هر فراخوانی که از کیف پول کاربر کم می‌شود (تومان).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  price?: number;
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
