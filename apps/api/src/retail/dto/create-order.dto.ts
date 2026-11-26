import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** Persian/Arabic digits → ASCII so `۱۲۳۴` passes the ASCII-only check. */
function toAsciiDigits(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/\D/g, '');
}

export const RETAIL_PAYMENT_METHODS = [
  'CARD_TO_CARD',
  'CASH_ON_DELIVERY',
] as const;

export const RETAIL_DELIVERY_METHODS = ['SNAP', 'PICKUP'] as const;

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

  @ApiPropertyOptional({ description: 'محله‌ی مقصد (در محدوده‌ی فروش)', maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  neighborhood?: string;

  @ApiPropertyOptional({ description: 'یادداشت مشتری', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @ApiPropertyOptional({
    description:
      'چهار رقم آخر کارت خودِ مشتری (کارتی که با آن کارت‌به‌کارت می‌کند). برای پرداخت کارت‌به‌کارت الزامی است.',
    example: '1234',
  })
  @IsOptional()
  @Transform(({ value }) => toAsciiDigits(value))
  @Matches(/^\d{4}$/, {
    message: 'چهار رقم آخر کارت باید عدد و دقیقاً ۴ رقم باشد',
  })
  payerCardLast4?: string;

  @ApiPropertyOptional({ enum: RETAIL_PAYMENT_METHODS, default: 'CARD_TO_CARD' })
  @IsOptional()
  @IsIn(RETAIL_PAYMENT_METHODS as unknown as string[])
  paymentMethod?: string;

  @ApiPropertyOptional({
    enum: RETAIL_DELIVERY_METHODS,
    default: 'SNAP',
    description: 'روش تحویل: ارسال با پیک یا دریافت حضوری',
  })
  @IsOptional()
  @IsIn(RETAIL_DELIVERY_METHODS as unknown as string[])
  deliveryMethod?: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}
