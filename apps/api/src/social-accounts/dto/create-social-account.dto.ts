import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { SOCIAL_PLATFORM_KEYS } from '../social-accounts.constants';

export class CreateSocialAccountDto {
  @ApiProperty({
    description: 'سکوی شبکه‌ی اجتماعی',
    enum: SOCIAL_PLATFORM_KEYS,
    example: 'INSTAGRAM',
  })
  @IsString()
  @IsIn(SOCIAL_PLATFORM_KEYS)
  platform!: string;

  @ApiProperty({ example: 'پیج اصلی شمالی کارت', maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @ApiProperty({ example: 'shomalicard', description: 'نام کاربری/شناسه‌ی ورود' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  username!: string;

  @ApiProperty({
    description: 'رمز عبور؛ رمزنگاری‌شده (AES-256-GCM) ذخیره می‌شود و در فهرست بازگردانده نمی‌شود.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password!: string;

  @ApiPropertyOptional({ example: 'social@shomalicard.ir', description: 'ایمیل بازیابی حساب' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  email?: string;

  @ApiPropertyOptional({ example: '09121234567', description: 'شماره‌ی بازیابی/ورود' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ example: 'https://instagram.com/shomalicard', description: 'نشانی صفحه' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  url?: string;

  @ApiPropertyOptional({ description: 'نکات نگه‌داری، ایمیل/موبایل پشتیبان، پرسش امنیتی و…' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ description: 'حساب فعال است؟', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
