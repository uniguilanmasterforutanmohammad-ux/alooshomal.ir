import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import {
  RETAIL_PRODUCT_UNITS,
  RETAIL_SELLER_PRODUCT_STATUSES,
} from './create-product.dto';

/** Shared by the estimate and the actual import. */
export class AiImportUrlDto {
  @ApiProperty({
    description: 'لینک محصول دیجی‌کالا',
    example: 'https://www.digikala.com/product/dkp-8423381/...',
    maxLength: 600,
  })
  @IsString()
  @MaxLength(600)
  url!: string;
}

export class EstimateAiImportDto extends AiImportUrlDto {}

export class ImportAiProductDto extends AiImportUrlDto {
  @ApiProperty({ description: 'شناسه‌ی دسته‌بندی مدیریت‌شده برای محصول' })
  @IsString()
  @MaxLength(40)
  categoryId!: string;

  @ApiPropertyOptional({
    description: 'قیمت فروش (تومان)؛ خالی = قیمت استخراج‌شده از دیجی‌کالا',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'موجودی اولیه', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ enum: RETAIL_PRODUCT_UNITS })
  @IsOptional()
  @IsString()
  @IsIn(RETAIL_PRODUCT_UNITS as unknown as string[])
  @MaxLength(20)
  unit?: string;

  @ApiPropertyOptional({
    enum: RETAIL_SELLER_PRODUCT_STATUSES,
    default: 'PENDING_REVIEW',
    description: 'وضعیت محصول پس از ایمپورت (پیش‌فرض: ارسال برای تأیید مدیر)',
  })
  @IsOptional()
  @IsIn(RETAIL_SELLER_PRODUCT_STATUSES as unknown as string[])
  status?: string;
}
