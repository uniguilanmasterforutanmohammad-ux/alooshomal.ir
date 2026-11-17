import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SyncChannelDto {
  @ApiPropertyOptional({
    description:
      'شناسه‌ی اقامتگاهی که تقویم کانال به آن متصل می‌شود (پیش‌فرض: اولین اقامتگاه)',
  })
  @IsOptional()
  @IsString()
  propertyId?: string;
}
