import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateFeedPostDto {
  @ApiPropertyOptional({ description: 'متن پست' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string;

  @ApiProperty({ description: 'آدرس تصاویر آپلودشده (به ترتیب نمایش)' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  images!: string[];

  @ApiPropertyOptional({ description: 'شناسه موضوع' })
  @IsOptional()
  @IsString()
  topicId?: string;
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
