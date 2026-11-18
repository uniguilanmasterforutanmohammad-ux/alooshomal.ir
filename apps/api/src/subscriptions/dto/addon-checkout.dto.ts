import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * Body of the mid-term add-on purchase: which businesses the «بسته مدیریت
 * کسب‌وکار» is bought for. There is no term here — the add-on always ends with
 * the running subscription.
 */
export class AddonCheckoutDto {
  @ApiPropertyOptional({
    type: [String],
    description:
      'شناسه‌ی کسب‌وکارهایی که مدیریت برای آن‌ها تا پایان دوره‌ی فعلی خریداری می‌شود.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  workspaceIds?: string[];

  @ApiPropertyOptional({
    example: '/dashboard/subscriptions',
    description: 'مسیر داخلی بازگشت پس از پرداخت (فقط مسیر نسبی با /).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(/^\/(?!\/)/, { message: 'returnTo باید یک مسیر داخلی معتبر باشد' })
  returnTo?: string;
}
