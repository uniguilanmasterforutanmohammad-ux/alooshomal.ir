import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

import { PLAN_PERIOD_MONTHS } from '../../common/plans';

export class CheckoutSubscriptionDto {
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

  /**
   * Internal page to return to after the gateway callback (e.g.
   * `/dashboard/onboarding`). Only same-site absolute paths are accepted.
   */
  @ApiPropertyOptional({
    example: '/dashboard/onboarding',
    description: 'مسیر داخلی بازگشت پس از پرداخت (فقط مسیر نسبی با /).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(/^\/(?!\/)/, { message: 'returnTo باید یک مسیر داخلی معتبر باشد' })
  returnTo?: string;
}
