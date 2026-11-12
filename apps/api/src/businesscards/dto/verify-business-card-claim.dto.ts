import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class VerifyBusinessCardClaimDto {
  @ApiProperty({ description: 'کد یکبارمصرف ارسال‌شده به موبایل/ایمیل کارت', example: '123456' })
  @IsString()
  @Length(6, 6)
  code!: string;
}
