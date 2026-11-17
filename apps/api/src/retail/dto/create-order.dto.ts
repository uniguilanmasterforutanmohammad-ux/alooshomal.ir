import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const RETAIL_PAYMENT_METHODS = [
  'CARD_TO_CARD',
  'CASH_ON_DELIVERY',
] as const;

export class OrderItemDto {
  @ApiProperty({ description: 'شناسه‌ی محصول' })
  @IsString()
  productId!: string;

  @ApiProperty({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
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

  @ApiPropertyOptional({ description: 'نشانی ارسال', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  customerAddress?: string;

  @ApiPropertyOptional({ description: 'یادداشت مشتری', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @ApiPropertyOptional({ enum: RETAIL_PAYMENT_METHODS, default: 'CARD_TO_CARD' })
  @IsOptional()
  @IsIn(RETAIL_PAYMENT_METHODS as unknown as string[])
  paymentMethod?: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}
