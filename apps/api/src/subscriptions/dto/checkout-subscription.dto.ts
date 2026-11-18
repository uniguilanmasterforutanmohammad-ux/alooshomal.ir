import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

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

  /**
   * Businesses the «بسته مدیریت کسب‌وکار» add-on is bought for. Empty/omitted
   * means a plain subscription. Every id must belong to the buyer and the
   * count may not exceed the plan's business capacity (Plus allows three).
   */
  @ApiPropertyOptional({
    type: [String],
    description:
      'شناسه‌ی کسب‌وکارهایی که «بسته مدیریت کسب‌وکار» برای آن‌ها خریداری می‌شود (خالی = فقط اشتراک).',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  workspaceIds?: string[];
}
