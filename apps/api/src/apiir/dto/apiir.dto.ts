import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsObject, IsOptional, Max, Min } from 'class-validator';

/** Turn one api.ir service on/off and/or set its future per-call user price. */
export class UpdateApiIrServiceDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    example: 25000,
    minimum: 0,
    description: 'هزینه‌ی هر فراخوانی که در آینده از کیف پول کاربر کم می‌شود (تومان).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  price?: number;
}

/** Body of the admin «آزمایش» call (a real, billed api.ir request). */
export class TestApiIrServiceDto {
  @ApiPropertyOptional({
    type: Object,
    example: { trackingCode: 'BL123456' },
    description: 'ورودی‌های سرویس؛ کلیدها همان نام فیلدهای api.ir هستند.',
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
