import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export const STOCK_MOVEMENT_KINDS = ['IN', 'OUT', 'ADJUST'] as const;

export class StockMovementDto {
  @ApiProperty({ description: 'شناسه‌ی محصول' })
  @IsString()
  productId!: string;

  @ApiProperty({ enum: STOCK_MOVEMENT_KINDS, default: 'IN' })
  @IsIn(STOCK_MOVEMENT_KINDS as unknown as string[])
  kind!: 'IN' | 'OUT' | 'ADJUST';

  @ApiProperty({ description: 'تعداد (برای ADJUST مقدار نهایی موجودی)', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity!: number;

  @ApiPropertyOptional({ description: 'توضیح حرکت انبار' })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  note?: string;
}
