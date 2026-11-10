import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

/**
 * One weekday's working hours. `closed` marks the day off; otherwise `open`
 * and `close` are 24-hour `HH:mm` strings (empty means «نامشخص»).
 */
export class WorkingHoursDayDto {
  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'ساعت شروع باید به شکل HH:mm باشد' })
  open?: string;

  @ApiPropertyOptional({ example: '21:00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'ساعت پایان باید به شکل HH:mm باشد' })
  close?: string;

  @ApiPropertyOptional({ description: 'این روز تعطیل است' })
  @IsOptional()
  @IsBoolean()
  closed?: boolean;
}

/** Weekly working hours for a business profile. */
export class WorkingHoursDto {
  @ApiPropertyOptional({ type: WorkingHoursDayDto })
  @IsOptional()
  saturday?: WorkingHoursDayDto;

  @ApiPropertyOptional({ type: WorkingHoursDayDto })
  @IsOptional()
  sunday?: WorkingHoursDayDto;

  @ApiPropertyOptional({ type: WorkingHoursDayDto })
  @IsOptional()
  monday?: WorkingHoursDayDto;

  @ApiPropertyOptional({ type: WorkingHoursDayDto })
  @IsOptional()
  tuesday?: WorkingHoursDayDto;

  @ApiPropertyOptional({ type: WorkingHoursDayDto })
  @IsOptional()
  wednesday?: WorkingHoursDayDto;

  @ApiPropertyOptional({ type: WorkingHoursDayDto })
  @IsOptional()
  thursday?: WorkingHoursDayDto;

  @ApiPropertyOptional({ type: WorkingHoursDayDto })
  @IsOptional()
  friday?: WorkingHoursDayDto;
}
