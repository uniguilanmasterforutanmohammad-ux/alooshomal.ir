import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { ACCOMMODATION_STATUSES } from './create-accommodation.dto';

/** Shared by the estimate and the actual Jabama import. */
export class AccommodationAiImportUrlDto {
  @ApiProperty({
    description: 'لینک اقامتگاه جاباما',
    example: 'https://www.jabama.com/stay/cottage-660018',
    maxLength: 600,
  })
  @IsString()
  @MaxLength(600)
  url!: string;
}

export class EstimateAccommodationAiImportDto extends AccommodationAiImportUrlDto {}

export class ImportAccommodationAiImportDto extends AccommodationAiImportUrlDto {
  @ApiPropertyOptional({
    enum: ACCOMMODATION_STATUSES,
    default: 'DRAFT',
    description: 'وضعیت اقامتگاه پس از ایمپورت (پیش‌فرض: پیش‌نویس)',
  })
  @IsOptional()
  @IsIn(ACCOMMODATION_STATUSES as unknown as string[])
  status?: string;

  @ApiPropertyOptional({ description: 'شناسه‌ی شهر مقصد (اختیاری)' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  cityId?: string;

  @ApiPropertyOptional({
    description: 'نوع اقامتگاه؛ خالی = نوع استخراج‌شده از جاباما',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  propertyType?: string;
}
