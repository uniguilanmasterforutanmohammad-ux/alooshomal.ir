import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ImportBusinessBatchDto {
  @ApiProperty({
    description:
      'شناسه‌ی کاربر مالکی که کارت‌های ایمپورت‌شده به نام او ثبت می‌شوند (تا تصاحب‌شدن)',
  })
  @IsString()
  @IsNotEmpty()
  ownerUserId!: string;

  @ApiPropertyOptional({
    description: 'برچسب دسته‌ی ایمپورت؛ خالی یعنی «ایمپورت دستی» + تاریخ',
    maxLength: 160,
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  label?: string;

  @ApiPropertyOptional({
    description: 'منبع داده (مثلاً behtarino یا admin-upload)',
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  source?: string;

  @ApiPropertyOptional({ description: 'توضیح اختیاری برای این دسته', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
