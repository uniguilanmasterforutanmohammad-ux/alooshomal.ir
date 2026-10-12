import { ApiPropertyOptional } from '@nestjs/swagger';
import { NewsStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '../../common/dto/pagination.dto';

export class ListNewsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: NewsStatus })
  @IsOptional()
  @IsEnum(NewsStatus)
  status?: NewsStatus;

  @ApiPropertyOptional({ description: 'جست‌وجو در عنوان و متن خبر' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'شناسه دسته‌بندی' })
  @IsOptional()
  @IsString()
  categoryId?: string;
}
