import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateWorkspaceDto {
  @ApiPropertyOptional({ description: 'نام نمایشی کسب‌وکار', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    description: 'کلید بسته‌ی صنف',
    example: 'dailyRental',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  industryKey?: string;
}
