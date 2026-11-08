import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

/** Shared query filters for the coupon / product / permalink list endpoints. */
export class ListFiltersDto {
  @ApiPropertyOptional({ description: 'شماره ابتدای لیست' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  offset?: number;

  @ApiPropertyOptional({ description: 'تعداد سطر بازگشتی' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @ApiPropertyOptional({ description: 'کلیدواژه جستجو' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ description: 'آیتم‌های آرشیوشده هم بیایند' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  witharchived?: boolean;

  @ApiPropertyOptional({ description: 'کد آیتم مالی مرتبط' })
  @IsOptional()
  @IsString()
  productcode?: string;
}
