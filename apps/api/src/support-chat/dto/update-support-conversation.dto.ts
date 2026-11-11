import { ApiPropertyOptional } from '@nestjs/swagger';
import { SupportChatStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class UpdateSupportConversationDto {
  @ApiPropertyOptional({ enum: SupportChatStatus })
  @IsOptional()
  @IsEnum(SupportChatStatus)
  status?: SupportChatStatus;

  @ApiPropertyOptional({ description: 'واگذاری گفتگو به مدیر جاری' })
  @IsOptional()
  @IsBoolean()
  assignToMe?: boolean;
}
