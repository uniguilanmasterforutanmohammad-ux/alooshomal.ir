import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/**
 * Body for the development-only shared-template test endpoint. `section` and
 * `subject` fill the template's `{0}` and `{1}` placeholders.
 */
export class DevAdminSmsTestDto {
  @ApiProperty({ example: '09123456789' })
  @IsString()
  @MaxLength(20)
  @Matches(/^[0-9+\u06F0-\u06F9\u0660-\u0669\s-]+$/, {
    message: 'شماره موبایل معتبر نیست',
  })
  phone!: string;

  @ApiPropertyOptional({ example: 'پشتیبانی', default: 'پشتیبانی' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  section?: string;

  @ApiPropertyOptional({
    example: 'پشتیبانی آنلاین',
    default: 'پشتیبانی آنلاین',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  subject?: string;
}
