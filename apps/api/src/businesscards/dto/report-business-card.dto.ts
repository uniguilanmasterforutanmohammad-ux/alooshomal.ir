import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/** Reasons a visitor may pick when reporting a public business card. */
export const BUSINESS_CARD_REPORT_REASONS = [
  'INAPPROPRIATE',
  'OWNERSHIP',
  'WRONG_INFO',
  'SPAM',
  'OTHER',
] as const;

export type BusinessCardReportReason =
  (typeof BUSINESS_CARD_REPORT_REASONS)[number];

/** Persian labels used in the admin notification body. */
export const BUSINESS_CARD_REPORT_REASON_LABELS: Record<
  BusinessCardReportReason,
  string
> = {
  INAPPROPRIATE: 'محتوای نامناسب',
  OWNERSHIP: 'این کسب‌وکار برای من است',
  WRONG_INFO: 'اطلاعات نادرست',
  SPAM: 'تبلیغ/اسپم',
  OTHER: 'سایر',
};

export class ReportBusinessCardDto {
  @ApiProperty({
    enum: BUSINESS_CARD_REPORT_REASONS,
    description:
      'دلیل گزارش: محتوای نامناسب، «این کسب‌وکار برای من است»، اطلاعات نادرست، تبلیغ/اسپم یا سایر',
  })
  @IsIn(BUSINESS_CARD_REPORT_REASONS)
  reason!: BusinessCardReportReason;

  @ApiPropertyOptional({ description: 'توضیح اختیاری بازدیدکننده', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
