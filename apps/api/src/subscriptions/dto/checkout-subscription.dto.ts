import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { PLAN_PERIOD_MONTHS } from '../../common/plans';

/**
 * Optional identity leg of the same checkout. When present and the account is
 * not verified yet, its price is added to the single gateway payment and the
 * inquiries run right after the payment is confirmed.
 */
export class CheckoutIdentityDto {
  @ApiPropertyOptional({
    example: '0012345678',
    description: 'کد ملی ۱۰ رقمی برای استعلام هویت',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'کد ملی باید دقیقاً ۱۰ رقم باشد' })
  nationalCode?: string;

  @ApiPropertyOptional({
    example: '1370/01/01',
    description: 'تاریخ تولد شمسی (YYYY/MM/DD)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  birthDate?: string;

  @ApiPropertyOptional({
    description: 'خرید استعلام جواز کسب برای دریافت تیک آبی',
  })
  @IsOptional()
  @IsBoolean()
  withLicense?: boolean;

  @ApiPropertyOptional({ description: 'کد پیگیری جواز کسب' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  licenseTrackingCode?: string;
}

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

  /**
   * The «مدیریت کسب‌وکار» package the buyer picked in the onboarding cart.
   * When omitted the workspace's own industry package is used. The chosen
   * package becomes the workspace's industry once the payment is confirmed.
   */
  @ApiPropertyOptional({
    example: 'dailyRental',
    description:
      'کلید بسته‌ی مدیریت کسب‌وکار انتخاب‌شده (خالی = بسته‌ی صنف خود کسب‌وکار).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  managementPackageKey?: string;

  /**
   * Identity inquiry paid together with the subscription (new accounts must
   * verify before the plan is useful). Omitted = no identity charge.
   */
  @ApiPropertyOptional({ type: CheckoutIdentityDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CheckoutIdentityDto)
  identity?: CheckoutIdentityDto;
}
