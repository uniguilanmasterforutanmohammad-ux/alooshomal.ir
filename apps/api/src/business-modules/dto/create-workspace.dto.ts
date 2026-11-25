import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateWorkspaceDto {
  @ApiPropertyOptional({ description: 'نام نمایشی کسب‌وکار', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    description:
      'شناسه‌ی دسته‌بندی کسب‌وکار (از `GET /businesses`). برای ساخت کسب‌وکار جدید الزامی است و صنف/بسته‌ی مدیریت از آن تعیین می‌شود.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  categoryId?: string;

  @ApiPropertyOptional({
    description:
      'کلید بسته‌ی صنف (جایگزین قدیمی `categoryId`؛ اگر هر دو داده شوند `categoryId` اولویت دارد).',
    example: 'dailyRental',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  industryKey?: string;
}
