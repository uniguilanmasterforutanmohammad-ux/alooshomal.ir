import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const ACCOMMODATION_STATUSES = ['DRAFT', 'PUBLISHED', 'PAUSED'] as const;
export type AccommodationStatus = (typeof ACCOMMODATION_STATUSES)[number];

export class CreateAccommodationDto {
  @ApiProperty({ example: 'ویلای ساحلی شمال', maxLength: 160 })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @ApiPropertyOptional({ description: 'توضیحات کامل اقامتگاه', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({
    description: 'نوع اقامتگاه (آزاد؛ مثلاً APARTMENT / VILLA / SUITE)',
    example: 'VILLA',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  propertyType?: string;

  @ApiPropertyOptional({ description: 'شناسه‌ی شهر (از تاکسونومی)' })
  @IsOptional()
  @IsString()
  cityId?: string;

  @ApiPropertyOptional({ example: 'مازندران، نوشهر، خیابان ساحلی' })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  address?: string;

  @ApiPropertyOptional({ example: 36.645 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 51.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ default: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  maxGuests?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50)
  bedrooms?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  beds?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50)
  bathrooms?: number;

  @ApiPropertyOptional({ description: 'قیمت پایه‌ی هر شب (تومان)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  basePrice?: number;

  @ApiPropertyOptional({
    description: 'ودیعه‌ی رزرو (تومان)؛ ۰ = بدون ودیعه‌ی آنلاین',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  depositAmount?: number;

  @ApiPropertyOptional({ default: 'IRR' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @ApiPropertyOptional({ description: 'حداقل شب اقامت', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  minNights?: number;

  @ApiPropertyOptional({ example: '14:00' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  checkInTime?: string;

  @ApiPropertyOptional({ example: '12:00' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  checkOutTime?: string;

  @ApiPropertyOptional({
    description: 'امکانات (مثلاً «استخر»، «پارکینگ»، «اینترنت»)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiPropertyOptional({ enum: ACCOMMODATION_STATUSES, default: 'DRAFT' })
  @IsOptional()
  @IsIn(ACCOMMODATION_STATUSES as unknown as string[])
  status?: AccommodationStatus;

  @ApiPropertyOptional({ description: 'نامک سفارشی (در صورت خالی‌بودن خودکار ساخته می‌شود)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;
}
