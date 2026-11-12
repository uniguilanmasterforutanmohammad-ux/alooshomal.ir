import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Query for the «محله» picker in the builders. Neighbourhoods are free-form
 * (the user may always type a new one), so this only offers suggestions taken
 * from the neighbourhoods already recorded for the chosen city.
 */
export class SearchNeighborhoodDto {
  @ApiPropertyOptional({ description: 'شناسه‌ی شهر برای محدودکردن پیشنهادها' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  cityId?: string;

  @ApiPropertyOptional({ description: 'متن جست‌وجو' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @ApiPropertyOptional({ description: 'حداکثر نتایج (۱ تا ۵۰)', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
