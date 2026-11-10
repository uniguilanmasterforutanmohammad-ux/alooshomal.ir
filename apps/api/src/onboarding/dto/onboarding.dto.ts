import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
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

  @ApiProperty({ description: 'نمایش این مرحله به کاربران', default: true })
  @IsBoolean()
  enabled!: boolean;
}

export class UpdateOnboardingStepsDto {
  @ApiProperty({ type: [OnboardingStepDto] })
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => OnboardingStepDto)
  steps!: OnboardingStepDto[];
}
