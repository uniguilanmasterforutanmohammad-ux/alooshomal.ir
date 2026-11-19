import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  ONBOARDING_STEP_KINDS,
  type OnboardingStepKind,
} from '../onboarding.constants';

export class OnboardingStepDto {
  @ApiPropertyOptional({
    description:
      'شناسه‌ی یکتای مرحله. برای مراحل پیش‌فرض همان kind است و برای مرحله‌ی سفارشی خالی بگذارید تا خودکار ساخته شود.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  id?: string;

  @ApiProperty({
    enum: ONBOARDING_STEP_KINDS,
    description: 'نوع مرحله (تعیین‌کننده‌ی قاعده‌ی تکمیل خودکار)',
  })
  @IsIn(ONBOARDING_STEP_KINDS)
  kind!: OnboardingStepKind;

  @ApiProperty({ example: 'استعلام هویت' })
  @IsString()
  @MaxLength(120)
  title!: string;

  @ApiProperty({ example: 'کد ملی و تاریخ تولد را وارد کنید.' })
  @IsString()
  @MaxLength(600)
  description!: string;

  @ApiPropertyOptional({ example: '/dashboard/profile' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  href?: string;

  @ApiPropertyOptional({
    description:
      'برای مرحله‌ی ماژول: کلید ماژول/محصول از کتابخانه‌ی «شروع آسان» (مثل `plan:<id>`، `management:<key>`، `zohal:<key>`، `apiir:<key>`، `biolink` یا `businessCard`).',
    example: 'plan:cmv3h20qk0001ow01nzajfpde',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  moduleKey?: string;

  @ApiProperty({ description: 'نمایش این مرحله به کاربران', default: true })
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional({
    description:
      'مرحله‌ی اختیاری؛ کاربر می‌تواند بدون تکمیل آن به مرحله‌ی بعد برود.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  optional?: boolean;
}

export class UpdateOnboardingStepsDto {
  @ApiProperty({ type: [OnboardingStepDto] })
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => OnboardingStepDto)
  steps!: OnboardingStepDto[];
}

export class SaveOnboardingStepDataDto {
  @ApiProperty({
    description:
      'مقادیر فرم مرحله‌ی ماژول؛ کلیدها همان نام فیلدهای تعریف‌شده در ماژول هستند.',
    example: { nationalCode: '0012345679', birthDate: '1370/01/01' },
  })
  @IsObject()
  data!: Record<string, unknown>;
}

export class SelectOnboardingPlanDto {
  @ApiPropertyOptional({
    description:
      'شناسه‌ی اشتراکی که کاربر در مرحله‌ی ۴ انتخاب کرده (برای پلن رایگان هم ارسال می‌شود).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  planId?: string;
}

export class AddOnboardingDocumentDto {
  @ApiProperty({ description: 'آدرس عمومی فایل آپلودشده' })
  @IsString()
  @MaxLength(500)
  url!: string;

  @ApiPropertyOptional({ example: 'javaz.pdf' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'حجم فایل به بایت', example: 120000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  size?: number;

  @ApiPropertyOptional({ example: 'application/pdf' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  contentType?: string;
}

export class SaveOnboardingBusinessDto {
  @ApiProperty({ description: 'عنوان کسب‌وکار', example: 'اقامتگاه ساحلی' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ description: 'شناسه‌ی شهر' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  cityId?: string;

  @ApiPropertyOptional({ description: 'شناسه‌ی دسته‌بندی کسب‌وکار' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  businessId?: string;

  @ApiPropertyOptional({ description: 'شماره موبایل کسب‌وکار' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  mobile?: string;

  @ApiPropertyOptional({ description: 'آدرس کسب‌وکار' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ description: 'نام مدیر یا مسئول' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;
}
