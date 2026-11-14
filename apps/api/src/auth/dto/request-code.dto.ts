import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class RequestCodeDto {
  @ApiProperty({ example: '09123456789' })
  @IsString()
  @MaxLength(20)
  @Matches(/^[0-9+\u06F0-\u06F9\u0660-\u0669\s-]+$/, {
    message: 'شماره موبایل معتبر نیست',
  })
  phone!: string;

  @ApiPropertyOptional({
    example: 'user@example.com',
    description:
      'ایمیل اختیاری؛ کد یکبارمصرف علاوه بر پیامک به این آدرس هم ارسال می‌شود. برای کاربران موجود، ایمیل حساب ملاک است.',
  })
  @IsOptional()
  @IsEmail({}, { message: 'ایمیل معتبر نیست' })
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional({
    enum: ['bale', 'sms'],
    description:
      'کانال دلخواه ارسال کد. پیش‌فرض: بله و در صورت نبود حساب بله، پیامک. مقدار «sms» ارسال پیامکی را اجباری می‌کند (دکمه‌ی «ارسال با پیامک» در صفحه‌ی ورود).',
  })
  @IsOptional()
  @IsIn(['bale', 'sms'], { message: 'کانال ارسال کد معتبر نیست' })
  channel?: 'bale' | 'sms';
}
