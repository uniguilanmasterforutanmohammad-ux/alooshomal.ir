import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpsertCardAccountDto {
  @ApiProperty({ example: '6037-9975-1234-5678', description: 'شماره کارت ۱۶ رقمی' })
  @IsString()
  @MinLength(16)
  @MaxLength(24)
  cardNumber!: string;

  @ApiProperty({ example: 'علی رضایی', description: 'نام صاحب کارت' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  holderName!: string;

  @ApiPropertyOptional({ example: 'بانک ملی' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  bankName?: string;

  @ApiPropertyOptional({ example: 'IR000000000000000000000000' })
  @IsOptional()
  @IsString()
  @MaxLength(34)
  iban?: string;

  @ApiPropertyOptional({
    description: 'توضیح برای مشتری (مثلاً «پس از واریز، رسید را آپلود کنید»)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instructions?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
