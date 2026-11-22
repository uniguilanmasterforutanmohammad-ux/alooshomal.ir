import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationDto } from '../../common/dto/pagination.dto';
import { SENT_EMAIL_STATUSES } from './list-emails.dto';

export const NOTIFICATION_CHANNELS = ['EMAIL', 'SMS'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export class ListNotificationsDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'ali@example.com' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;

  @ApiPropertyOptional({ enum: SENT_EMAIL_STATUSES })
  @IsOptional()
  @IsIn(SENT_EMAIL_STATUSES as unknown as string[])
  status?: string;

  @ApiPropertyOptional({ enum: NOTIFICATION_CHANNELS })
  @IsOptional()
  @IsIn(NOTIFICATION_CHANNELS as unknown as string[])
  channel?: NotificationChannel;
}
