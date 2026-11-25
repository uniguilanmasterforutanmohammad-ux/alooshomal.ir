import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export const ORDER_APPROVAL_MODES = ['MANUAL', 'AUTO'] as const;

export class UpsertShopSettingsDto {
  @ApiPropertyOptional({ description: 'شهر محل فروش', example: 'تنکابن' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'محله‌های تحت پوشش ارسال (خالی = کل شهر)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  neighborhoods?: string[];

  @ApiPropertyOptional({ description: 'کرایه‌ی ثابت ارسال با پیک (تومان)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  deliveryFee?: number;

  @ApiPropertyOptional({ description: 'ارسال با پیک فعال باشد', default: true })
  @IsOptional()
  @IsBoolean()
  deliveryEnabled?: boolean;

  @ApiPropertyOptional({ description: 'ارسال با پیک اسنپ فعال باشد', default: true })
  @IsOptional()
  @IsBoolean()
  snapEnabled?: boolean;

  @ApiPropertyOptional({ description: 'دریافت حضوری فعال باشد', default: true })
  @IsOptional()
  @IsBoolean()
  pickupEnabled?: boolean;

  @ApiPropertyOptional({ description: 'نشانی دریافت حضوری', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  pickupAddress?: string;

  @ApiPropertyOptional({ description: 'ساعات مراجعه برای دریافت حضوری', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  pickupHours?: string;

  @ApiPropertyOptional({ description: 'شماره تماس پشتیبانی', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  supportPhone?: string;

  @ApiPropertyOptional({ description: 'شرایط لغو و مرجوعی', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  returnPolicy?: string;

  @ApiPropertyOptional({
    description: 'مهلت ارسال رسید و نگه‌داشتن موجودی (دقیقه)',
    default: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  reservationMinutes?: number;

  @ApiPropertyOptional({
    enum: ORDER_APPROVAL_MODES,
    default: 'MANUAL',
    description:
      'MANUAL = تأیید سفارش توسط فروشنده پیش از پرداخت؛ AUTO = پرداخت بلافاصله پس از ثبت سفارش',
  })
  @IsOptional()
  @IsIn(ORDER_APPROVAL_MODES as unknown as string[])
  orderApprovalMode?: string;
}
