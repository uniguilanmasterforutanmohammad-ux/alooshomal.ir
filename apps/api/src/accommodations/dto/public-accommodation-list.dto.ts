import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/** Sort orders offered by the public accommodation directory. */
export const ACCOMMODATION_SORTS = ['newest', 'price-asc', 'price-desc'] as const;
export type AccommodationSort = (typeof ACCOMMODATION_SORTS)[number];

/** Query string of `GET /public/accommodations` (the `/stay` directory). */
export class PublicAccommodationListDto {
  @ApiPropertyOptional({ description: 'جست‌وجوی متنی در عنوان، توضیحات و آدرس' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ description: 'شناسه‌ی شهر (از تاکسونومی شهرها)' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  cityId?: string;

  @ApiPropertyOptional({ description: 'نوع اقامتگاه (مثلاً VILLA / APARTMENT / SUITE)' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  type?: string;

  @ApiPropertyOptional({ type: Number, description: 'حداقل ظرفیت مهمان' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  guests?: number;

  @ApiPropertyOptional({ type: Number, description: 'کمترین قیمت هر شب (تومان)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ type: Number, description: 'بیشترین قیمت هر شب (تومان)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'تاریخ ورود (YYYY-MM-DD)؛ اقامتگاه‌های آزاد در این بازه نمایش داده می‌شوند',
    example: '2026-12-01',
  })
  @IsOptional()
  @IsDateString()
  checkIn?: string;

  @ApiPropertyOptional({
    description: 'تاریخ خروج (YYYY-MM-DD)؛ باید بعد از تاریخ ورود باشد',
    example: '2026-12-04',
  })
  @IsOptional()
  @IsDateString()
  checkOut?: string;

  @ApiPropertyOptional({
    enum: ACCOMMODATION_SORTS,
    description: 'ترتیب نمایش: جدیدترین، ارزان‌ترین یا گران‌ترین',
  })
  @IsOptional()
  @IsIn(ACCOMMODATION_SORTS)
  sort?: AccommodationSort;
}
