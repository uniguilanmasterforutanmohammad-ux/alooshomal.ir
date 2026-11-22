import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

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

/** Create an admin-defined composite product from several api.ir services. */
export class CreateApiIrCompositeDto {
  @ApiProperty({ example: 'استعلام هویت و ثنا' })
  @IsString()
  @MaxLength(120)
  label!: string;

  @ApiPropertyOptional({ example: 'چند استعلام در یک پرداخت.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    type: [String],
    example: ['persondata', 'sana'],
    description: 'کلید سرویس‌هایی که با هم فروخته و به ترتیب اجرا می‌شوند.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  serviceKeys!: string[];

  @ApiPropertyOptional({
    example: 0,
    minimum: 0,
    description: '۰ یعنی جمع تعرفه‌ی سرویس‌ها؛ در غیر این صورت مبلغ ثابت.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  amount?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

/** Update an existing api.ir composite (all fields optional). */
export class UpdateApiIrCompositeDto {
  @ApiPropertyOptional({ example: 'استعلام هویت و ثنا' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  serviceKeys?: string[];

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  amount?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
