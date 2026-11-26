import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAddressDto {
  @ApiPropertyOptional({ example: 'خانه', description: 'عنوان دلخواه آدرس' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  title?: string;

  @ApiProperty({ example: 'محمد رضایی' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  receiverName!: string;

  @ApiProperty({ example: '09121234567' })
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  phone!: string;

  @ApiPropertyOptional({ example: 'مازندران' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  province?: string;

  @ApiPropertyOptional({ example: 'بابلسر' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  city?: string;

  @ApiPropertyOptional({ example: 'شهرک دریا' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  neighborhood?: string;

  @ApiProperty({ example: 'خیابان ساحلی، پلاک ۱۲، واحد ۳' })
  @IsString()
  @MinLength(5)
  @MaxLength(400)
  address!: string;

  @ApiPropertyOptional({ example: '4733165478' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ example: true, description: 'آدرس پیش‌فرض' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
