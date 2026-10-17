import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdTargetKind } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAdDto {
  @ApiProperty({ enum: AdTargetKind })
  @IsEnum(AdTargetKind)
  kind!: AdTargetKind;

  @ApiProperty({ description: 'شناسه کارت ویزیت یا بیولینک مورد نظر برای تبلیغ' })
  @IsString()
  targetId!: string;

  @ApiPropertyOptional({ description: 'توضیح اختیاری برای مدیر' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
