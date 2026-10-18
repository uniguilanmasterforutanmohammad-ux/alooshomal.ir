import { ApiPropertyOptional } from '@nestjs/swagger';
import { BiolinkStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationDto } from '../../common/dto/pagination.dto';

export class ListBiolinksDto extends PaginationDto {
  @ApiPropertyOptional({ enum: BiolinkStatus })
  @IsOptional()
  @IsEnum(BiolinkStatus)
  status?: BiolinkStatus;

  @ApiPropertyOptional({ example: 'علی' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
