import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
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

  @ApiPropertyOptional({ description: 'متراژ اقامتگاه (متر مربع)', example: 120 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  areaSize?: number;

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

  @ApiPropertyOptional({
    description: 'تعداد مهمان شامل قیمت پایه؛ مهمان اضافه هزینه‌ی جدا دارد',
    default: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  baseGuests?: number;

  @ApiPropertyOptional({ description: 'هزینه‌ی نظافت یک‌باره (تومان)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cleaningFee?: number;

  @ApiPropertyOptional({
    description: 'هزینه‌ی هر مهمان اضافه در هر شب (تومان)',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  extraGuestFee?: number;

  @ApiPropertyOptional({
    description: 'درصد تخفیف اقامت بلندمدت',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  longStayDiscountPercent?: number;

  @ApiPropertyOptional({
    description: 'حداقل شب برای اعمال تخفیف اقامت بلندمدت',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  longStayMinNights?: number;

  @ApiPropertyOptional({
    enum: ['FLEXIBLE', 'MODERATE', 'STRICT', 'NON_REFUNDABLE'],
    default: 'FLEXIBLE',
  })
  @IsOptional()
  @IsIn(['FLEXIBLE', 'MODERATE', 'STRICT', 'NON_REFUNDABLE'])
  cancellationPolicy?: string;

  @ApiPropertyOptional({
    description: 'تا چند روز قبل از ورود، لغو بدون جریمه است',
    default: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  cancellationDays?: number;

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

  @ApiPropertyOptional({
    description: 'قوانین اقامتگاه (مثلاً «ورود حیوان ممنوع»)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rules?: string[];

  @ApiPropertyOptional({
    description: 'رزرو آنی؛ درخواست مهمان بدون تأیید مالک تأیید می‌شود',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  instantBooking?: boolean;

  @ApiPropertyOptional({ description: 'امتیاز نمایشی (۰ تا ۵)', example: 4.8 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ description: 'تعداد دیدگاه‌های منبع', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reviewsCount?: number;

  @ApiPropertyOptional({ description: 'منبع ورود داده (مثلاً JABAMA)' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  externalSource?: string;

  @ApiPropertyOptional({ description: 'آدرس صفحه‌ی منبع' })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  externalUrl?: string;

  @ApiPropertyOptional({ description: 'شناسه‌ی اقامتگاه در منبع' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  externalRef?: string;

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
