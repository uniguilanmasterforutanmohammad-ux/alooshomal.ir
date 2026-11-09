import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationDto } from '../../common/dto/pagination.dto';

export class ListFinanceDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'INV-1405' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    enum: ['ISSUED', 'VOID'],
    description: 'وضعیت فاکتور (فقط برای فهرست فاکتورها)',
  })
  @IsOptional()
  @IsIn(['ISSUED', 'VOID'])
  status?: 'ISSUED' | 'VOID';

  @ApiPropertyOptional({ description: 'نوع منبع فروش (فقط برای فاکتورها)' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  sourceType?: string;

  @ApiPropertyOptional({ description: 'دسته‌ی هزینه (فقط برای هزینه‌ها)' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;
}
