import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

import { PLAN_PERIOD_MONTHS } from '../../common/plans';

export class RequestSubscriptionDto {
  @ApiProperty({ description: 'شناسه اشتراک درخواستی' })
  @IsString()
  planId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;

  @ApiPropertyOptional({
    enum: PLAN_PERIOD_MONTHS,
    default: 1,
    description: 'طول دوره به ماه (۱ = ماهانه، ۳/۶/۱۲ = دوره‌های تخفیف‌دار)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn(PLAN_PERIOD_MONTHS)
  months?: number;
}
