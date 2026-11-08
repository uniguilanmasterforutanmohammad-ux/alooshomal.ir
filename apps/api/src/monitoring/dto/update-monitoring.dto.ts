import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * Admin-editable configuration of the server resource monitor. Every field is
 * optional so the panel can PATCH a single value.
 */
export class UpdateMonitoringDto {
  @ApiPropertyOptional({ description: 'روشن/خاموش بودن پایش خودکار منابع' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'آستانه‌ی مصرف رم (درصد) که در صورت عبور، هشدار ارسال می‌شود.',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  ramThreshold?: number;

  @ApiPropertyOptional({
    description: 'آستانه‌ی مصرف پردازنده (درصد).',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  cpuThreshold?: number;

  @ApiPropertyOptional({
    description: 'آستانه‌ی مصرف فضای دیسک (درصد).',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  diskThreshold?: number;

  @ApiPropertyOptional({
    description: 'فاصله‌ی تکرار هشدار برای همان منبع (دقیقه).',
    minimum: 5,
    maximum: 1440,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(1440)
  cooldownMinutes?: number;

  @ApiPropertyOptional({
    description: 'فاصله‌ی نمونه‌برداری (ثانیه).',
    minimum: 30,
    maximum: 3600,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(3600)
  intervalSeconds?: number;

  @ApiPropertyOptional({
    description:
      'مدت ماندگاری بالای آستانه (دقیقه) پیش از ارسال هشدار؛ مثلاً ۱ یعنی فقط اگر مصرف یک دقیقه بالای آستانه بماند هشدار برود. صفر = بدون تأخیر.',
    minimum: 0,
    maximum: 120,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(120)
  sustainMinutes?: number;

  @ApiPropertyOptional({
    description:
      'ایمیل گیرنده‌ی هشدارها؛ خالی یعنی ایمیل ادمین اصلی. برای پاک‌کردن، رشته‌ی خالی بفرستید.',
  })
  @IsOptional()
  @IsString()
  @ValidateIf((dto: UpdateMonitoringDto) => Boolean(dto.alertEmail))
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: 'ایمیل معتبر نیست' })
  alertEmail?: string;

  @ApiPropertyOptional({
    description:
      'شماره‌ی موبایل گیرنده‌ی هشدارها (09xxxxxxxxx)؛ خالی یعنی موبایل ادمین اصلی.',
  })
  @IsOptional()
  @IsString()
  @ValidateIf((dto: UpdateMonitoringDto) => Boolean(dto.alertPhone))
  @Matches(/^09\d{9}$/, { message: 'شماره موبایل باید به شکل 09xxxxxxxxx باشد' })
  alertPhone?: string;
}
