import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, Min } from 'class-validator';

/**
 * Filters for the PayPing transaction / withdraw reports. Mirrors the body the
 * PayPing report services accept (dates are ISO-8601 strings, amounts in Toman).
 */
export class ReportFilterDto {
  @ApiPropertyOptional({
    description: 'شروع بازه (تاریخ میلادی ISO، مثلاً 2026-01-01)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'پایان بازه (تاریخ میلادی ISO، مثلاً 2026-12-31)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsISO8601()
  toDate?: string;

  @ApiPropertyOptional({ description: 'شماره صفحه (از ۱)', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageNumber?: number;

  @ApiPropertyOptional({ description: 'تعداد سطر در هر صفحه', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
