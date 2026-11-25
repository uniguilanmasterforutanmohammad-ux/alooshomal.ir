import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelBookingDto {
  @ApiPropertyOptional({ example: 'تغییر برنامه‌ی سفر' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
