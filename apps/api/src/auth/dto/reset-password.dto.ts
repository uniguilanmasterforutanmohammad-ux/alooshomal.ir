import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: '123456', description: 'کد یکبارمصرف ارسال‌شده' })
  @IsString()
  @Matches(/^\d{4,10}$/, { message: 'کد تأیید معتبر نیست' })
  code!: string;

  @ApiProperty({ example: 'StrongPass123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'رمز عبور باید حداقل ۸ کاراکتر باشد' })
  @MaxLength(72)
  password!: string;
}
