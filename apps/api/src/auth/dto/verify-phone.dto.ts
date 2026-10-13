import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class VerifyPhoneDto {
  @ApiProperty({ example: '09123456789' })
  @IsString()
  @MaxLength(20)
  phone!: string;

  @ApiProperty({ example: '374143' })
  @IsString()
  @MinLength(4)
  @MaxLength(10)
  code!: string;

  /** Only required the first time a phone signs up (account not found). */
  @ApiProperty({ required: false, example: 'سارا محمدی' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;
}
