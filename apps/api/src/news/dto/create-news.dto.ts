import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateNewsDto {
  @ApiProperty({ example: 'افتتاح پارک محله' })
  @IsString()
  @MinLength(4)
  @MaxLength(180)
  title!: string;

  @ApiPropertyOptional({ example: 'خلاصه یک‌خطی خبر' })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  summary?: string;

  @ApiPropertyOptional({ example: 'متن کامل خبر...' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  body?: string;

  @ApiPropertyOptional({ description: 'شناسه دسته‌بندی خبر' })
  @IsOptional()
  @IsString()
  categoryId?: string;
}
