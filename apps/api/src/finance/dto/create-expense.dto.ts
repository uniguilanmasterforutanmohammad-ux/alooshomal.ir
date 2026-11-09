import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty({ example: 'هزینه ماهانه سرور' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'سرور و زیرساخت' })
  @IsString()
  @MaxLength(80)
  category!: string;

  @ApiProperty({ example: 2500000, description: 'مبلغ کل هزینه به تومان' })
  @IsInt()
  @Min(1)
  @Max(1_000_000_000)
  amount!: number;

  @ApiPropertyOptional({ example: 0, description: 'بخش مالیات (اختیاری)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  taxAmount?: number;

  @ApiPropertyOptional({
    example: '2026-11-09',
    description: 'تاریخ هزینه (ISO)؛ پیش‌فرض اکنون',
  })
  @IsOptional()
  @IsDateString()
  spentAt?: string;

  @ApiPropertyOptional({ example: 'شرکت ابری' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  vendor?: string;

  @ApiPropertyOptional({ example: 'INV-8891' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'نشانی فایل رسید/فاکتور' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  attachmentUrl?: string;
}
