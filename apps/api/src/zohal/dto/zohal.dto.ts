import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsBoolean,
  IsArray,
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

/** Create an admin-defined composite product from several Zohal modules. */
export class CreateZohalCompositeDto {
  @ApiProperty({ example: 'استعلام هویت و جواز کسب' })
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
    example: ['shahkar', 'national_identity_inquiry'],
    description: 'کلید ماژول‌هایی که با هم فروخته و اجرا می‌شوند.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  serviceKeys!: string[];

  @ApiPropertyOptional({
    example: 0,
    minimum: 0,
    description: '۰ یعنی جمع تعرفه‌ی ماژول‌ها؛ در غیر این صورت مبلغ ثابت.',
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

/** Update an existing composite (all fields optional). */
export class UpdateZohalCompositeDto {
  @ApiPropertyOptional({ example: 'استعلام هویت و جواز کسب' })
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

/** Start a composite checkout with the inputs every module needs. */
export class CheckoutZohalCompositeDto {
  @ApiPropertyOptional({
    type: Object,
    example: { national_code: '0012345679', mobile: '09121234567' },
    description: 'ورودی‌های مشترک ماژول‌های این محصول (کلید = نام فیلد زحل).',
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @ApiPropertyOptional({ example: '/dashboard/inquiries' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  returnTo?: string;
}
