import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiPropertyOptional({
    example: false,
    description:
      'اگر true باشد، همان کد تأیید علاوه بر ایمیل با پیامک به شماره‌ی ثبت‌شده هم ارسال می‌شود.',
  })
  @IsOptional()
  @IsBoolean()
  sendToPhone?: boolean;
}
