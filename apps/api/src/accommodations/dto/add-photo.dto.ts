import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class AddAccommodationPhotoDto {
  @ApiProperty({ description: 'URL تصویر (خروجی `POST /uploads/gallery`)' })
  @IsString()
  @MaxLength(1000)
  url!: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'تصویر کاور باشد؟', default: false })
  @IsOptional()
  @IsBoolean()
  isCover?: boolean;
}
