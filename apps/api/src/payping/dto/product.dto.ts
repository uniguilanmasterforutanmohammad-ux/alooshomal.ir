import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

/** Body of `POST /v1/product` (create) and `PUT /v1/product` (update). */
export class ProductDto {
  @ApiProperty({ description: 'عنوان آیتم مالی' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiPropertyOptional({
    description: 'کد آیتم مالی (فقط در ویرایش)',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: 'توضیحات' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'مبلغ (تومان)', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ description: 'مبلغ توسط کاربر تعیین شود' })
  @IsOptional()
  @IsBoolean()
  defineAmountByUser?: boolean;

  @ApiPropertyOptional({ description: 'شامل مالیات' })
  @IsOptional()
  @IsBoolean()
  haveTax?: boolean;

  @ApiPropertyOptional({ description: 'تعداد موجودی' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  quantity?: number;

  @ApiPropertyOptional({ description: 'نامحدود' })
  @IsOptional()
  @IsBoolean()
  unlimited?: boolean;

  @ApiPropertyOptional({ description: 'لینک تصویر' })
  @IsOptional()
  @IsString()
  imageLink?: string;
}

/** Body of `POST /v1/permalink` / `PUT /v1/permalink`. */
export class PermalinkDto {
  @ApiProperty({ description: 'کد آیتم مالی' })
  @IsString()
  @MinLength(1)
  productCode!: string;

  @ApiPropertyOptional({ description: 'لینک ثابت دلخواه' })
  @IsOptional()
  @IsString()
  permalink?: string;
}
