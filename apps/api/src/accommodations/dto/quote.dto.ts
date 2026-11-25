import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class QuoteStayDto {
  @ApiProperty({ example: '2027-02-10' })
  @IsDateString()
  checkIn!: string;

  @ApiProperty({ example: '2027-02-13' })
  @IsDateString()
  checkOut!: string;

  @ApiPropertyOptional({ example: 2, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  guests?: number;
}
