import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const RATE_DAY_TYPES = ['ALL', 'WEEKEND', 'WEEKDAY', 'HOLIDAY'] as const;

export class CreateRateDto {
  @ApiPropertyOptional({ example: 'تعطیلات نوروز' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @ApiProperty({ example: '2027-03-15' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2027-03-25', description: 'غیرشامل' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ enum: RATE_DAY_TYPES, default: 'ALL' })
  @IsOptional()
  @IsIn(RATE_DAY_TYPES as unknown as string[])
  dayType?: string;

  @ApiProperty({ example: 1200000 })
  @IsInt()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  minNights?: number;
}

export class UpdateRateDto extends PartialType(CreateRateDto) {}
