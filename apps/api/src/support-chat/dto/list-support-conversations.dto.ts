import { ApiPropertyOptional } from '@nestjs/swagger';
import { SupportChatStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationDto } from '../../common/dto/pagination.dto';

export class ListSupportConversationsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: SupportChatStatus })
  @IsOptional()
  @IsEnum(SupportChatStatus)
  status?: SupportChatStatus;

  @ApiPropertyOptional({
    description: 'جستجو در نام، ایمیل یا موبایل کاربر و متن پیام‌ها',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;
}
