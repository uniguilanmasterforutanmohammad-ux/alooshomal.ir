import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationDto } from '../../common/dto/pagination.dto';

export class AdsOverviewQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'جستجو در عنوان، شغل یا شرکت' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;
}
