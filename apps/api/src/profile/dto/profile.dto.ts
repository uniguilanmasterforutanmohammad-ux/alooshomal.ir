import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RequestProfileChangeDto {
  @ApiProperty({ example: 'علی رضایی' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;
}

export class DecideProfileChangeDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsString()
  decision!: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ example: 'نام نامناسب است' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/** Ask for an OTP to be sent to the *new* phone (phone change) or to the
 *  current phone (email change). */
export class RequestContactOtpDto {
  @ApiPropertyOptional({
    example: '09123456789',
    description: 'برای تغییر شماره: شماره‌ی جدید تا کد به آن ارسال شود.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    example: 'sara@example.com',
    description: 'برای تغییر ایمیل: ایمیل جدید.',
  })
  @IsOptional()
  @IsEmail({}, { message: 'ایمیل معتبر نیست' })
  @MaxLength(160)
  email?: string;
}

export class VerifyContactChangeDto {
  @ApiProperty({ example: '374143' })
  @IsString()
  @MinLength(4)
  @MaxLength(10)
  code!: string;

  @ApiPropertyOptional({ example: '09123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'sara@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'ایمیل معتبر نیست' })
  @MaxLength(160)
  email?: string;
}
