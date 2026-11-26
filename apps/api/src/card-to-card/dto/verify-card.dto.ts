import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class VerifyCardDto {
  @ApiProperty({
    example: '6037-9975-1234-5678',
    description: 'شماره کارت ۱۶ رقمی به نام صاحب کسب‌وکار',
  })
  @IsString()
  @MinLength(16)
  @MaxLength(24)
  cardNumber!: string;
}
