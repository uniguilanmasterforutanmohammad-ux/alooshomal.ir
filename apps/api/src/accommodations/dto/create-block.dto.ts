import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCalendarBlockDto {
  @ApiProperty({ example: '2026-12-20' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-12-22' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ example: 'تعمیرات' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
