import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RevealSocialAccountDto {
  @ApiPropertyOptional({
    description: 'دلیل مشاهده‌ی رمز؛ در «گزارش‌های سیستم» ثبت می‌شود.',
    example: 'ورود به پیج برای انتشار محتوای جدید',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
