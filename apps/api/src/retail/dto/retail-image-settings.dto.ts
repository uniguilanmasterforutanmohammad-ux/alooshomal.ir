import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateRetailImageSettingsDto {
  @ApiPropertyOptional({ description: 'حداکثر تعداد تصویر هر محصول (۱–۲۰)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  maxImages?: number;

  @ApiPropertyOptional({ description: 'حداکثر حجم هر تصویر (کیلوبایت)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(64)
  @Max(20480)
  maxImageKb?: number;

  @ApiPropertyOptional({
    description: 'هزینه‌ی هر ۱۰۰۰ توکن ایمپورت محصول با هوش مصنوعی (تومان)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  aiPricePer1k?: number;

  @ApiPropertyOptional({
    description: 'حداقل هزینه‌ی هر ایمپورت محصول با هوش مصنوعی (تومان)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  aiMinPrice?: number;

  @ApiPropertyOptional({
    description:
      'حداقل تعداد عکس رسمی که هنگام ورود خودکار محصول از دیجی‌کالا گرفته می‌شود (۱–۲۰)',
    default: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  aiMinImages?: number;

  @ApiPropertyOptional({
    description: 'فعال‌بودن ارسال با پیک (اسنپ) به‌صورت سراسری برای همه‌ی فروشگاه‌ها',
  })
  @IsOptional()
  @IsBoolean()
  snapEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'فعال‌بودن دریافت حضوری به‌صورت سراسری برای همه‌ی فروشگاه‌ها',
  })
  @IsOptional()
  @IsBoolean()
  pickupEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'فعال‌بودن پرداخت در محل به‌صورت سراسری برای همه‌ی فروشگاه‌ها',
  })
  @IsOptional()
  @IsBoolean()
  cashOnDeliveryEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'فعال‌بودن پرداخت کارت به کارت برای سفارش‌های فروشگاه',
  })
  @IsOptional()
  @IsBoolean()
  cardToCardEnabled?: boolean;
}
