import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class ReportSmsTransactionDto {
  @ApiProperty({ description: 'متن کامل پیامک بانکی' })
  @IsString()
  @MinLength(5)
  @MaxLength(4000)
  rawText!: string;

  @ApiProperty({ description: 'مبلغ واریز به تومان', example: 450000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000_000)
  amount!: number;

  @ApiPropertyOptional({ description: 'چهار رقم آخر کارت مقصد', example: '5678' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/)
  destinationLast4?: string;

  @ApiPropertyOptional({ description: 'شماره کامل کارت مقصد (در صورت وجود)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{16}$/)
  destinationCard?: string;

  @ApiPropertyOptional({ example: 'بانک ملی' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  bankName?: string;

  @ApiPropertyOptional({ description: 'نام واریزکننده (در صورت وجود)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  senderName?: string;

  @ApiPropertyOptional({ description: 'شماره پیگیری بانکی' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  trackingNumber?: string;

  @ApiPropertyOptional({ description: 'شناسه یکتای پیامک در گوشی (برای جلوگیری از تکرار)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  smsId?: string;

  @ApiPropertyOptional({ description: 'زمان دریافت پیامک (ISO)' })
  @IsOptional()
  @IsDateString()
  smsReceivedAt?: string;

  @ApiPropertyOptional({ description: 'توضیح دستگاه' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
