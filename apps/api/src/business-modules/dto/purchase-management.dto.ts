import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PurchaseManagementDto {
  @ApiPropertyOptional({
    description: 'مدت خرید به ماه (پیش‌فرض: ۱۲ ماه)',
    example: 12,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  months?: number;

  @ApiPropertyOptional({ description: 'مسیر بازگشت پس از پرداخت' })
  @IsOptional()
  @IsString()
  returnTo?: string;
}
