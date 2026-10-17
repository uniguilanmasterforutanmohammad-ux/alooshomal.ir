import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RewardKind } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRewardDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @ApiProperty({ enum: RewardKind })
  @IsEnum(RewardKind)
  kind!: RewardKind;

  @ApiProperty({ description: 'هزینه به امتیاز' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  points!: number;

  @ApiPropertyOptional({ description: 'شناسه پلن برای جایزه‌های نوع اشتراک' })
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class UpdateRewardDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @ApiPropertyOptional({ enum: RewardKind })
  @IsOptional()
  @IsEnum(RewardKind)
  kind?: RewardKind;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  points?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class RedeemRewardDto {
  @ApiPropertyOptional({ description: 'شناسه کارت/بیولینک برای جایزه‌های تبلیغاتی' })
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiPropertyOptional({ enum: ['BUSINESS_CARD', 'BIOLINK'] })
  @IsOptional()
  @IsString()
  targetKind?: 'BUSINESS_CARD' | 'BIOLINK';
}

export class AdjustPointsDto {
  @ApiProperty({ description: 'مقدار امتیاز (مثبت افزودن، منفی کسر)' })
  @Type(() => Number)
  @IsInt()
  delta!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
