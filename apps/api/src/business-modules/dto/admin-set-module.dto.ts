import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class AdminSetModuleDto {
  @ApiProperty({ description: 'فعال یا غیرفعال‌کردن ماژول برای این کسب‌وکار' })
  @IsBoolean()
  enabled!: boolean;
}
