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
import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

import {
  ONBOARDING_STEP_KINDS,
  ONBOARDING_FIELD_PREFILLS,
  ONBOARDING_MATCH_SOURCES,
  ONBOARDING_MATCH_MODES,
  type OnboardingStepKind,
} from '../onboarding.constants';

export class OnboardingFieldOptionDto {
  @ApiProperty({
    description: 'مقدار ذخیره/ارسال‌شده برای این گزینه',
    example: 'true',
  })
  @IsString()
  @MaxLength(120)
  value!: string;

  @ApiProperty({
    description: 'برچسب نمایش‌داده‌شده به کاربر',
    example: 'مرد',
  })
  @IsString()
  @MaxLength(120)
  label!: string;
}

export class OnboardingFieldOverrideDto {
  @ApiPropertyOptional({ description: 'برچسب جدید فیلد', example: 'موبایل ثبت‌نام' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @ApiPropertyOptional({
    description: 'متن راهنمای داخل فیلد',
    example: '09121234567',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  placeholder?: string;

  @ApiPropertyOptional({ description: 'الزامی‌بودن فیلد را بازنویسی می‌کند' })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({
    enum: ONBOARDING_FIELD_PREFILLS,
    description:
      'مقدار پیش‌فرض از اطلاعات حساب کاربر: موبایل ثبت‌نام، کد ملی، تاریخ تولد یا نام و نام خانوادگی.',
  })
  @IsOptional()
  @IsIn(ONBOARDING_FIELD_PREFILLS)
  prefill?: (typeof ONBOARDING_FIELD_PREFILLS)[number];

  @ApiPropertyOptional({
    description: 'قفل‌کردن مقدار پیش‌فرض تا کاربر نتواند آن را تغییر دهد.',
  })
  @IsOptional()
  @IsBoolean()
  readonly?: boolean;

  @ApiPropertyOptional({
    type: [OnboardingFieldOptionDto],
    description:
      'گزینه‌های فیلد بولی؛ برای مثال نگاشت «true» به «مرد» و «false» به «زن».',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => OnboardingFieldOptionDto)
  options?: OnboardingFieldOptionDto[];

  @ApiPropertyOptional({
    description: 'استفاده از دیتاپیکر شمسی سایت برای فیلدهای تاریخ.',
  })
  @IsOptional()
  @IsBoolean()
  datePicker?: boolean;
}

export class OnboardingStepOnSuccessDto {
  @ApiPropertyOptional({
    description:
      'در صورت مثبت‌بودن استعلام این ماژول، «تیک سفید» (احراز هویت و تطبیق شماره تماس) صادر شود.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  grantWhiteTick?: boolean;

  @ApiPropertyOptional({
    description:
      'در صورت مثبت‌بودن استعلام این ماژول، «تیک آبی» (استعلام جواز کسب) صادر شود.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  grantBlueTick?: boolean;
}

export class OnboardingMatchRuleDto {
  @ApiProperty({
    description:
      'نام فیلدی از پاسخ استعلام که مقایسه می‌شود (مثل `nationalCode` یا `fullName`).',
    example: 'nationalCode',
  })
  @IsString()
  @MaxLength(120)
  resultField!: string;

  @ApiProperty({
    enum: ONBOARDING_MATCH_SOURCES,
    description:
      'مقدار مرجع مقایسه: کد ملی/نام/موبایل کاربر یا یک فیلد از فرم همین مرحله.',
    example: 'userNationalCode',
  })
  @IsIn(ONBOARDING_MATCH_SOURCES)
  compareTo!: (typeof ONBOARDING_MATCH_SOURCES)[number];

  @ApiPropertyOptional({
    description:
      'وقتی `compareTo` برابر `field` است، نام فیلد فرمی که مقدارش مبنا قرار می‌گیرد.',
    example: 'nationalCode',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  field?: string;

  @ApiPropertyOptional({
    enum: ONBOARDING_MATCH_MODES,
    default: 'normalized',
    description:
      'نوع مقایسه: `normalized` (پیش‌فرض، با نرمال‌سازی ارقام/حروف)، `exact` (دقیق)، `nameMatch` (تطبیق نام بدون حساسیت به ترتیب کلمات) یا `masked` (تطبیق مقدار ماسک‌شده‌ی استعلام، مثل `536****001`، که فقط بخش‌های نمایان را با مقدار کاربر می‌سنجد).',
  })
  @IsOptional()
  @IsIn(ONBOARDING_MATCH_MODES)
  mode?: (typeof ONBOARDING_MATCH_MODES)[number];
}

@ApiExtraModels(
  OnboardingFieldOverrideDto,
  OnboardingFieldOptionDto,
  OnboardingMatchRuleDto,
)
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

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { $ref: '#/components/schemas/OnboardingFieldOverrideDto' },
    description:
      'برای مرحله‌ی ماژول: بازنویسی هر فیلد فرم با کلید نام فیلد (مثل `mobile`). مقدار پیش‌فرض از حساب، قفل‌بودن، برچسب بولی سفارشی و دیتاپیکر شمسی از اینجا تنظیم می‌شود.',
    example: {
      mobile: { prefill: 'userMobile', readonly: true, label: 'موبایل ثبت‌نام' },
      gender: { options: [{ value: 'true', label: 'مرد' }, { value: 'false', label: 'زن' }] },
      birth_date: { datePicker: true },
    },
  })
  @IsOptional()
  @IsObject()
  fieldOverrides?: Record<string, OnboardingFieldOverrideDto>;

  @ApiPropertyOptional({
    type: OnboardingStepOnSuccessDto,
    description:
      'برای مرحله‌ی ماژول: پس از استعلام مثبت این ماژول، کدام تیک‌ها به کاربر داده شود.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OnboardingStepOnSuccessDto)
  onSuccess?: OnboardingStepOnSuccessDto;

  @ApiPropertyOptional({
    type: [OnboardingMatchRuleDto],
    description:
      'برای مرحله‌ی ماژول: قواعد تطبیق نتیجه‌ی استعلام. اگر تنظیم شود، فقط وقتی همه‌ی قواعد برقرار باشند استعلام «مثبت» شمرده می‌شود (مثلاً کد ملی مالک جواز برابر کد ملی کاربر). بدون قاعده، هر استعلام موفق مثبت است.',
    example: [
      { resultField: 'nationalCode', compareTo: 'userNationalCode' },
    ],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => OnboardingMatchRuleDto)
  match?: OnboardingMatchRuleDto[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'برای مرحله‌ی ماژول: شناسه‌ی مراحلی که باید پیش از اجرای استعلام این مرحله محقق شوند. مرحله‌ی پیش‌فرض (مثل `identity`) باید تکمیل شده باشد و مرحله‌ی ماژول باید نتیجه‌ی مثبت داده باشد؛ مثلاً استعلام جواز کسب بعد از استعلام موفق هویت اجرا می‌شود.',
    example: ['identity'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  requires?: string[];

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

  @ApiPropertyOptional({
    description:
      'شماره موبایل کسب‌وکار؛ در مرحله‌ی استعلام هویت با کد ملی کاربر و شاهکار تأیید می‌شود.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  mobile?: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'شماره‌های موبایل اضافه‌ی کسب‌وکار؛ همه با همان کد ملی مرحله‌ی استعلام هویت و شاهکار بررسی می‌شوند.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  additionalMobiles?: string[];

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
