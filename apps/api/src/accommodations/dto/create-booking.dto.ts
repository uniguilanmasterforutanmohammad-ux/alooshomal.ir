import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: 'علی رضایی', maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  guestName!: string;

  @ApiProperty({ example: '09121234567', maxLength: 30 })
  @IsString()
  @MinLength(5)
  @MaxLength(30)
  guestPhone!: string;

  @ApiPropertyOptional({ example: 'guest@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  guestEmail?: string;

  @ApiProperty({ example: '2026-12-20' })
  @IsDateString()
  checkIn!: string;

  @ApiProperty({ example: '2026-12-23' })
  @IsDateString()
  checkOut!: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  guests?: number;

  @ApiPropertyOptional({ description: 'پیام مهمان' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @ApiPropertyOptional({ description: 'کانال رزرو (برای ثبت دستی توسط مالک)' })
  @IsOptional()
  @IsString()
  channelId?: string;
}
