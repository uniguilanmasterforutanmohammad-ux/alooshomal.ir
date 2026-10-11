import { ApiPropertyOptional } from '@nestjs/swagger';
import { BiolinkStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

import { PaginationDto } from '../../common/dto/pagination.dto';

export class ListBusinessCardsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: BiolinkStatus })
  @IsOptional()
  @IsEnum(BiolinkStatus)
  status?: BiolinkStatus;
}
