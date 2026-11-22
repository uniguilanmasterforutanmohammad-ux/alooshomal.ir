import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class ManagementDiscountsDto {
  @ApiPropertyOptional({ description: 'درصد تخفیف دوره ۳ ماهه', example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(90)
  '3'?: number;

  @ApiPropertyOptional({ description: 'درصد تخفیف دوره ۶ ماهه', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(90)
  '6'?: number;

  @ApiPropertyOptional({ description: 'درصد تخفیف دوره یک‌ساله', example: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(90)
  '12'?: number;
}

export class CreateManagementDto {
  @ApiProperty({
    description: 'کلید یکتای انگلیسی مدیریت',
    example: 'dailyRental',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(41)
  key!: string;

  @ApiProperty({ example: 'اقامت و سفر — اجاره روزانه' })
  @IsString()
  @MaxLength(160)
  label!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(600)
  description?: string;

  @ApiPropertyOptional({ description: 'نمایش در پنل کاربر' })
  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @ApiPropertyOptional({ type: ManagementDiscountsDto })
  @IsOptional()
  discounts?: ManagementDiscountsDto;

  @ApiPropertyOptional({ type: [String], description: 'کلید ماژول‌های عضو' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modules?: string[];

  @ApiProperty({
    type: [String],
    description:
      'شناسه‌ی دسته‌بندی‌های کسب‌وکار (از تنظیمات ← شهرها و کسب‌وکارها) که این بسته به آن‌ها متصل می‌شود',
    example: ['clx0000000000000000000001'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  categoryIds!: string[];
}

export class UpdateManagementDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(600)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @ApiPropertyOptional({ type: ManagementDiscountsDto })
  @IsOptional()
  discounts?: ManagementDiscountsDto;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modules?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'شناسه‌ی دسته‌بندی‌های کسب‌وکار متصل به این بسته',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];
}

export class AddManagementModuleDto {
  @ApiProperty({ example: 'crm' })
  @IsString()
  moduleKey!: string;
}
