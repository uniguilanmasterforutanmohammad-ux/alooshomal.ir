import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const RETAIL_PRODUCT_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'PUBLISHED',
  'REJECTED',
  'ARCHIVED',
] as const;
export type RetailProductStatus = (typeof RETAIL_PRODUCT_STATUSES)[number];

/** Statuses a seller may set from the panel (publishing needs admin review). */
export const RETAIL_SELLER_PRODUCT_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'ARCHIVED',
] as const;

/** Common sale units offered as a dropdown instead of free text. */
export const RETAIL_PRODUCT_UNITS = [
  'عدد',
  'کیلوگرم',
  'گرم',
  'لیتر',
  'میلی‌لیتر',
  'بسته',
  'جعبه',
  'کارتن',
  'متر',
  'متر مربع',
  'دستگاه',
  'خدمت',
] as const;

export class ProductSpecDto {
  @ApiProperty({ description: 'عنوان مشخصه', example: 'ابعاد' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @ApiProperty({ description: 'مقدار مشخصه', example: '۳۰×۳۰ سانتی‌متر' })
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  value!: string;
}

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

  @ApiProperty({ description: 'شناسه‌ی دسته‌بندی مدیریت‌شده' })
  @IsString()
  @MaxLength(40)
  categoryId!: string;

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

  @ApiPropertyOptional({ enum: RETAIL_PRODUCT_UNITS, default: 'عدد' })
  @IsOptional()
  @IsString()
  @IsIn(RETAIL_PRODUCT_UNITS as unknown as string[])
  @MaxLength(20)
  unit?: string;

  @ApiPropertyOptional({ description: 'برند محصول', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string;

  @ApiPropertyOptional({
    type: [ProductSpecDto],
    description: 'مشخصات فنی محصول (ردیف‌های عنوان/مقدار)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => ProductSpecDto)
  specs?: ProductSpecDto[];

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

  @ApiPropertyOptional({
    enum: RETAIL_SELLER_PRODUCT_STATUSES,
    default: 'DRAFT',
    description:
      'DRAFT یا PENDING_REVIEW (ارسال برای تأیید) یا ARCHIVED؛ انتشار مستقیم فقط پس از تأیید مدیر انجام می‌شود.',
  })
  @IsOptional()
  @IsIn(RETAIL_SELLER_PRODUCT_STATUSES as unknown as string[])
  status?: RetailProductStatus;

  @ApiPropertyOptional({ description: 'نامک سفارشی' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;
}
