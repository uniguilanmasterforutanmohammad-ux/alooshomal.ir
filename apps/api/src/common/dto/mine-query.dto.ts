import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import { PaginationDto } from './pagination.dto';

/**
 * Paged «items of mine» query. Lists are scoped to the business workspace
 * selected in the panel header; `workspace=all` asks for the user's items from
 * every business instead (used by the dashboard's summary tiles).
 */
export class MineQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'all = همه‌ی کسب‌وکارها (پیش‌فرض: کسب‌وکار فعال)',
    enum: ['all'],
  })
  @IsOptional()
  @IsIn(['all'])
  workspace?: 'all';
}
