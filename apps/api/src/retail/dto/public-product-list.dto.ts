import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/** Sort orders offered by the public product directory. */
export const PRODUCT_SORTS = ['newest', 'price-asc', 'price-desc'] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

/** Query string of `GET /public/products` (the `/shop` directory). */
export class PublicProductListDto {
  @ApiPropertyOptional({ description: 'جست‌وجوی متنی در عنوان و توضیحات محصول' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ description: 'نامک عمومی فروشگاه (workspace publicSlug)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  shop?: string;

  @ApiPropertyOptional({ description: 'دسته‌بندی محصول' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @ApiPropertyOptional({ type: Number, description: 'کمترین قیمت (تومان)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ type: Number, description: 'بیشترین قیمت (تومان)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    enum: PRODUCT_SORTS,
    description: 'ترتیب نمایش: جدیدترین، ارزان‌ترین یا گران‌ترین',
  })
  @IsOptional()
  @IsIn(PRODUCT_SORTS)
  sort?: ProductSort;
}
