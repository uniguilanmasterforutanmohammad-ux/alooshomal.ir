import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const CARD_PAYMENT_REVIEW_STATUSES = ['APPROVED', 'REJECTED'] as const;

export class ReviewCardPaymentDto {
  @ApiProperty({ enum: CARD_PAYMENT_REVIEW_STATUSES })
  @IsIn(CARD_PAYMENT_REVIEW_STATUSES as unknown as string[])
  status!: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ description: 'یادداشت بررسی (مثلاً دلیل رد)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewNote?: string;
}
