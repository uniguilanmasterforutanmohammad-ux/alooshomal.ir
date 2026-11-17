import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const RETAIL_ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PAID',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;

export const RETAIL_PAYMENT_STATUSES = [
  'UNPAID',
  'PENDING_REVIEW',
  'PAID',
  'REFUNDED',
] as const;

export class UpdateOrderDto {
  @ApiPropertyOptional({ enum: RETAIL_ORDER_STATUSES })
  @IsOptional()
  @IsIn(RETAIL_ORDER_STATUSES as unknown as string[])
  status?: string;

  @ApiPropertyOptional({ enum: RETAIL_PAYMENT_STATUSES })
  @IsOptional()
  @IsIn(RETAIL_PAYMENT_STATUSES as unknown as string[])
  paymentStatus?: string;

  @ApiPropertyOptional({ description: 'یادداشت داخلی' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
