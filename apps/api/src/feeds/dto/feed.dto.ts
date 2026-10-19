import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateFeedPostDto {
  @ApiPropertyOptional({ description: 'متن پست' })
  @IsOptional()
  @IsString()
  // The composer sends a small subset of HTML (bold, lists, links…), so the
  // cap covers the markup on top of the visible text.
  @MaxLength(8000)
  body?: string;

  @ApiProperty({ description: 'آدرس تصاویر آپلودشده (به ترتیب نمایش)' })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  images!: string[];

  @ApiPropertyOptional({ description: 'شناسه موضوع' })
  @IsOptional()
  @IsString()
  topicId?: string;

  @ApiPropertyOptional({
    description:
      'تگ کارت/بیولینک روی پست (رایگان نیست و پس از تأیید پرداخت توسط مدیر فعال می‌شود)',
    enum: ['BIOLINK', 'BUSINESS_CARD'],
  })
  @IsOptional()
  @IsIn(['BIOLINK', 'BUSINESS_CARD'])
  tagKind?: 'BIOLINK' | 'BUSINESS_CARD';

  @ApiPropertyOptional({ description: 'شناسه بیولینک یا کارت ویزیت برای تگ' })
  @IsOptional()
  @IsString()
  tagTargetId?: string;
}

export class ListFeedQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'جستجو در متن پست' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @ApiPropertyOptional({ description: 'فیلتر بر اساس موضوع' })
  @IsOptional()
  @IsString()
  topicId?: string;
}
