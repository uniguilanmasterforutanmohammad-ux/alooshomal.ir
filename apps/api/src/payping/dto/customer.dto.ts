import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Body of `POST /v1/customer` and `PUT /v1/customer/{code}`. */
export class CustomerDto {
  @ApiProperty({ description: 'نام' })
  @IsString()
  @MinLength(1)
  firstName!: string;

  @ApiProperty({ description: 'نام خانوادگی' })
  @IsString()
  @MinLength(1)
  lastName!: string;

  @ApiPropertyOptional({ description: 'پست الکترونیک' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'تلفن همراه' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'نام کسب‌وکار' })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({ description: 'کدملی' })
  @IsOptional()
  @IsString()
  nationalId?: string;

  @ApiPropertyOptional({ description: 'کد پستی' })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiPropertyOptional({ description: 'استان' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'شهر' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'آدرس' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'اطلاعات اضافی' })
  @IsOptional()
  @IsString()
  additionalInfo?: string;

  @ApiPropertyOptional({ description: 'متن یادآوری' })
  @IsOptional()
  @IsString()
  memo?: string;

  @ApiPropertyOptional({ description: 'حقوقی = true، حقیقی = false' })
  @IsOptional()
  @IsBoolean()
  isBusiness?: boolean;
}

/** Query filters for the customer list. */
export class CustomerListQueryDto {
  @ApiPropertyOptional({ description: 'شروع صفحه از شماره ۱', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  offset?: number;

  @ApiPropertyOptional({ description: 'تعداد سطر بازگشتی', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @ApiPropertyOptional({ description: 'متن جستجو' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ description: 'نوع مشتری (۰ حقیقی، ۱ حقوقی)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customerType?: number;
}
