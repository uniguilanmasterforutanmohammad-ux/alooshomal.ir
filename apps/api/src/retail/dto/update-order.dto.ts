import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

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

export const RETAIL_DELIVERY_STATUSES = [
  'PENDING',
  'PREPARING',
  'READY',
  'DISPATCHED',
  'DELIVERED',
  'FAILED',
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

  @ApiPropertyOptional({ enum: RETAIL_DELIVERY_STATUSES })
  @IsOptional()
  @IsIn(RETAIL_DELIVERY_STATUSES as unknown as string[])
  deliveryStatus?: string;

  @ApiPropertyOptional({ description: 'یادداشت داخلی' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @ApiPropertyOptional({ description: 'بهای خرید کالاهای سفارش (تومان)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  costAmount?: number;

  @ApiPropertyOptional({ description: 'هزینه‌ی بسته‌بندی (تومان)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  packagingFee?: number;

  @ApiPropertyOptional({ description: 'کرایه‌ی واقعی پیک (تومان)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  courierActualFee?: number;

  @ApiPropertyOptional({ description: 'مبلغ بازپرداخت‌شده (تومان)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  refundAmount?: number;

  @ApiPropertyOptional({ description: 'دلیل لغو سفارش' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancelReason?: string;
}
