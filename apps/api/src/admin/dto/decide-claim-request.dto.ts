import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class DecideClaimRequestDto {
  @ApiProperty({ description: 'تأیید (true) یا رد (false) درخواست تصاحب' })
  @IsBoolean()
  approve!: boolean;

  @ApiPropertyOptional({
    description: 'توضیح مدیر؛ برای رد، به کاربر نمایش داده می‌شود',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
