import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const RETAIL_PRODUCT_STATUSES = [
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED',
] as const;
export type RetailProductStatus = (typeof RETAIL_PRODUCT_STATUSES)[number];

export class CreateProductDto {
  @ApiProperty({ example: 'زعفران سرگل ۵ گرمی', maxLength: 160 })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @ApiPropertyOptional({ description: 'توضیحات محصول', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ example: 'خواربار' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @ApiPropertyOptional({ description: 'کد کالا / SKU', example: 'SF-5G' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sku?: string;

  @ApiPropertyOptional({ description: 'قیمت فروش (تومان)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'قیمت قبل از تخفیف (تومان)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  compareAtPrice?: number;

  @ApiPropertyOptional({
    description: 'بهای خرید هر واحد (تومان) — برای محاسبه‌ی سود سفارش',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({ description: 'موجودی اولیه', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ description: 'آستانه‌ی هشدار موجودی کم', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @ApiPropertyOptional({ default: 'عدد' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiPropertyOptional({ description: 'آدرس تصویر اصلی (از `POST /uploads/gallery`)' })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  imageUrl?: string;

  @ApiPropertyOptional({ type: [String], description: 'گالری تصاویر' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gallery?: string[];

  @ApiPropertyOptional({ enum: RETAIL_PRODUCT_STATUSES, default: 'DRAFT' })
  @IsOptional()
  @IsIn(RETAIL_PRODUCT_STATUSES as unknown as string[])
  status?: RetailProductStatus;

  @ApiPropertyOptional({ description: 'نامک سفارشی' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;
}
