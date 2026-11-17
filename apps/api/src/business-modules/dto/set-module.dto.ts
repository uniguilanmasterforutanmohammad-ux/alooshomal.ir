import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetModuleDto {
  @ApiProperty({ description: 'فعال یا غیرفعال‌کردن ماژول', example: true })
  @IsBoolean()
  enabled!: boolean;
}
