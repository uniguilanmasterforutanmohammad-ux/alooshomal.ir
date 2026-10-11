import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationDto } from '../../common/dto/pagination.dto';

export class PublicBiolinkQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'عبارت جستجو در نام، عنوان شغلی، شرکت و معرفی' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @ApiPropertyOptional({ description: 'فیلتر بر اساس شناسه شهر' })
  @IsOptional()
  @IsString()
  cityId?: string;

  @ApiPropertyOptional({ description: 'فیلتر بر اساس شناسه کسب‌وکار' })
  @IsOptional()
  @IsString()
  businessId?: string;

  @ApiPropertyOptional({ enum: ['recent', 'liked'], default: 'recent' })
  @IsOptional()
  @IsIn(['recent', 'liked'])
  sort: 'recent' | 'liked' = 'recent';
}
