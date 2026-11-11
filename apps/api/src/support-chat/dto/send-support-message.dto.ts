import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SendSupportMessageDto {
  @ApiProperty({ example: 'سلام، در ورود به حساب مشکل دارم.' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;

  @ApiPropertyOptional({
    description:
      'شناسه‌ی گفتگو؛ اگر خالی باشد گفتگوی باز جاری یا یک گفتگوی تازه استفاده می‌شود.',
  })
  @IsOptional()
  @IsString()
  conversationId?: string;
}
