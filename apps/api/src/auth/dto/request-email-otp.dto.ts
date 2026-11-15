import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';

/** Step 1 of the «موبایل یا ایمیل» sign-in: send a one-time code by email. */
export class RequestEmailOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'ایمیل معتبر نیست' })
  @MaxLength(254)
  email!: string;
}
