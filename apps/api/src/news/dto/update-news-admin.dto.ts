import { ApiPropertyOptional } from '@nestjs/swagger';
import { NewsStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

import { CreateNewsDto } from './create-news.dto';

/** Admin edit payload: same fields as a reporter's, plus an optional status. */
export class UpdateNewsAdminDto extends CreateNewsDto {
  @ApiPropertyOptional({ enum: NewsStatus })
  @IsOptional()
  @IsEnum(NewsStatus)
  status?: NewsStatus;
}
