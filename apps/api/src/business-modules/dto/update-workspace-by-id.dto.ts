import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateWorkspaceByIdDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 'dailyRental' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  industryKey?: string;

  @ApiPropertyOptional({ description: 'این کسب‌وکار پیش‌فرض باشد؟' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
