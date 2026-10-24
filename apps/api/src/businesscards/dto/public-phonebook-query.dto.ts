import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationDto } from '../../common/dto/pagination.dto';

export class PublicPhonebookQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'عبارت جستجو در نام، عنوان شغلی، شرکت یا شماره' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @ApiPropertyOptional({
    enum: ['alpha', 'recent'],
    default: 'alpha',
    description: 'ترتیب فهرست: الفبایی (پیش‌فرض) یا جدیدترین',
  })
  @IsOptional()
  @IsIn(['alpha', 'recent'])
  sort: 'alpha' | 'recent' = 'alpha';
}
