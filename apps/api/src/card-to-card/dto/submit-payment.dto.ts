import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const CARD_PAYMENT_REFERENCE_TYPES = ['ORDER', 'BOOKING', 'OTHER'] as const;

export class SubmitCardPaymentDto {
  @ApiProperty({ example: 'علی رضایی', maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  customerName!: string;

  @ApiProperty({ example: '09121234567', maxLength: 30 })
  @IsString()
  @MinLength(5)
  @MaxLength(30)
  customerPhone!: string;

  @ApiProperty({ description: 'مبلغ واریزشده (تومان)', example: 500000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional({ description: 'تاریخ واریز (ISO)' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({ description: 'شماره پیگیری تراکنش', maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  trackingNumber?: string;

  @ApiProperty({ description: 'آدرس رسید (خروجی `POST /public/uploads/receipt`)' })
  @IsString()
  @MaxLength(600)
  receiptUrl!: string;

  @ApiPropertyOptional({ description: 'توضیح مشتری', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @ApiPropertyOptional({ enum: CARD_PAYMENT_REFERENCE_TYPES })
  @IsOptional()
  @IsIn(CARD_PAYMENT_REFERENCE_TYPES as unknown as string[])
  referenceType?: string;

  @ApiPropertyOptional({ description: 'شناسه‌ی سفارش یا رزرو مرتبط' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  referenceId?: string;
}
