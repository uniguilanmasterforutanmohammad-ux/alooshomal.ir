import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Admin-editable pricing of the «ورود خودکار از جاباما» feature. */
export class UpdateAccommodationAiSettingsDto {
  @ApiPropertyOptional({ description: 'هزینه‌ی هر ۱۰۰۰ توکن (تومان)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  aiPricePer1k?: number;

  @ApiPropertyOptional({ description: 'حداقل هزینه‌ی هر ایمپورت (تومان)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  aiMinPrice?: number;

  @ApiPropertyOptional({ description: 'حداقل تعداد تصویر ایمپورت‌شده' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  aiMinImages?: number;
}
