import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

/** Second step of an email sign-in or email sign-up: email + one-time code. */
export class VerifyEmailLoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'ایمیل معتبر نیست' })
  email!: string;

  @ApiProperty({ example: '374143', description: 'کد یکبارمصرف ارسال‌شده' })
  @IsString()
  @MinLength(4)
  @MaxLength(10)
  code!: string;
}
