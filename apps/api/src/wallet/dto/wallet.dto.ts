import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Admin manual correction of one user's wallet balance. */
export class AdjustWalletDto {
  @ApiProperty({
    example: 25000,
    minimum: -1_000_000_000,
    maximum: 1_000_000_000,
    description: 'مثبت = افزودن به بدهی کاربر، منفی = بستانکاری (تومان)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(-1_000_000_000)
  @Max(1_000_000_000)
  amount!: number;

  @ApiPropertyOptional({ example: 'تخفیف پشتیبانی' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}
