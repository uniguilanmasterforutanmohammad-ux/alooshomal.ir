import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsHexColor,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateBusinessCardDto {
  @ApiProperty({ example: 'سارا محمدی' })
  @IsString()
  @MaxLength(120)
  fullName!: string;

  @ApiPropertyOptional({ example: 'مدیر محصول' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  jobTitle?: string;

  @ApiPropertyOptional({ example: 'آلوشمال' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  company?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(600)
  bio?: string;

  @ApiPropertyOptional({ example: '09120000000' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({ example: '09120000000' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  mobile?: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'https://example.com' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true, require_tld: false })
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true, require_tld: false })
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkedin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instagram?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telegram?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  twitter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiPropertyOptional({ example: '#8B3A1A' })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @ApiPropertyOptional({ example: 'classic' })
  @IsOptional()
  @IsString()
  template?: string;

  @ApiPropertyOptional({ description: 'شناسه شهر انتخاب‌شده' })
  @IsOptional()
  @IsString()
  cityId?: string;

  @ApiPropertyOptional({ description: 'شناسه کسب‌وکار انتخاب‌شده' })
  @IsOptional()
  @IsString()
  businessId?: string;

  @ApiPropertyOptional({
    description:
      'شناسه بیولینکِ خودِ کاربر برای اتصال به این کارت ویزیت (خالی = قطع اتصال)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  biolinkId?: string;

  @ApiPropertyOptional({
    description:
      'ذخیره به‌عنوان پیش‌نویس (بدون ارسال برای تأیید مدیر و بدون اطلاع‌رسانی)',
  })
  @IsOptional()
  @IsBoolean()
  draft?: boolean;
}
