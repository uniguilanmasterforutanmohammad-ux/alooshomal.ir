import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationDto } from '../../common/dto/pagination.dto';

export const SENT_EMAIL_STATUSES = ['SENT', 'FAILED'] as const;
export type SentEmailStatus = (typeof SENT_EMAIL_STATUSES)[number];

export class ListEmailsDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'ali@example.com' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;

  @ApiPropertyOptional({ enum: SENT_EMAIL_STATUSES })
  @IsOptional()
  @IsIn(SENT_EMAIL_STATUSES as unknown as string[])
  status?: SentEmailStatus;
}
