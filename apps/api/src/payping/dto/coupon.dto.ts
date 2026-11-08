import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/** Body of `POST /v1/coupon` and `PUT /v1/coupon`. */
export class CouponDto {
  @ApiProperty({ description: 'نام کد تخفیف' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({
    description: 'نوع تخفیف: ۱ = مبلغ ثابت، ۰ = درصد',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  type?: number;

  @ApiPropertyOptional({ description: 'مقدار تخفیف' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  amount?: number;

  @ApiPropertyOptional({
    description: 'کد تخفیف دلخواه (در حالت ویرایش اجباری است)',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: 'کد تخفیف کاربر (اختیاری)' })
  @IsOptional()
  @IsString()
  userCouponCode?: string;

  @ApiPropertyOptional({ description: 'تاریخ انقضا (شمسی/میلادی رشته‌ای)' })
  @IsOptional()
  @IsString()
  redeemDate?: string;

  @ApiPropertyOptional({ description: 'ساعت انقضا' })
  @IsOptional()
  @IsString()
  redeemTime?: string;

  @ApiPropertyOptional({ description: 'حداکثر تعداد استفاده' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxRedemption?: number;

  @ApiPropertyOptional({ description: 'فعال بودن کد تخفیف' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'کد آیتم‌های مالی مرتبط',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  activeProductCode?: string[];
}
