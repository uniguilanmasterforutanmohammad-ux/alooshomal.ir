import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class CreateBackupDto {
  @ApiPropertyOptional({
    description:
      'تصاویر و فایل‌های آپلودشده هم داخل بسته‌ی پشتیبان قرار بگیرند (پیش‌فرض: بله)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeMedia?: boolean;
}
