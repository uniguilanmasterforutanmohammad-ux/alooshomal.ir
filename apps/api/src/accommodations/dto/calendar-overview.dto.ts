import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

export class CalendarOverviewQueryDto {
  @ApiPropertyOptional({
    description: 'شروع بازه (YYYY-MM-DD)؛ پیش‌فرض ابتدای ماه جاری',
    example: '2026-11-01',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'پایان بازه (YYYY-MM-DD، غیرشامل)؛ پیش‌فرض ابتدای ماه دو ماه بعد',
    example: '2027-01-01',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
