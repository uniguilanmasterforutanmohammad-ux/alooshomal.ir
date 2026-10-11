import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BoostFeature, BoostTargetKind } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBoostDto {
  @ApiProperty({ enum: BoostTargetKind })
  @IsEnum(BoostTargetKind)
  kind!: BoostTargetKind;

  @ApiProperty({ description: 'شناسه بیولینک یا کارت ویزیت' })
  @IsString()
  targetId!: string;

  @ApiPropertyOptional({ enum: BoostFeature, default: BoostFeature.POLE })
  @IsOptional()
  @IsEnum(BoostFeature)
  feature?: BoostFeature;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
