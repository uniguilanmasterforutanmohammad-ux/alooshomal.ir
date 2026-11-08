import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class VerifyAdminLoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail({}, { message: 'ایمیل معتبر نیست' })
  email!: string;

  @ApiProperty({ example: '374143', description: 'کد یکبارمصرف ارسال‌شده' })
  @IsString()
  @MinLength(4)
  @MaxLength(10)
  code!: string;
}
