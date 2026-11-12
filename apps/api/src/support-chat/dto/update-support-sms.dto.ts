import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateSupportSmsDto {
  @ApiPropertyOptional({
    description: 'ارسال پیامک هنگام دریافت پیام جدید پشتیبانی',
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    example: '09121234567',
    description:
      'شماره‌ی دریافت پیامک؛ خالی بگذارید تا از شماره‌ی حساب ادمین استفاده شود.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @ValidateIf((dto: UpdateSupportSmsDto) => Boolean(dto.phone?.trim()))
  @Matches(/^(\+?98|0)?9\d{9}$/, { message: 'شماره موبایل معتبر نیست' })
  phone?: string;
}
