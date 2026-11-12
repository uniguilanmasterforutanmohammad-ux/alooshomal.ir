import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Query for the search box that picks the deeper taxonomy levels in the
 * biolink / business-card / business builders. The tree is far too large for a
 * dropdown, so the client asks for a short, filtered page instead.
 *
 * With the default `ANY`, the search walks the levels from the most specific
 * one upwards: «زیرشاخه» (`TAG`) first and, only when that yields nothing,
 * «زیردسته» (`SUB`).
 */
export class SearchTaxonomyNodeDto {
  @ApiPropertyOptional({
    enum: ['SUB', 'TAG', 'ANY'],
    default: 'ANY',
    description:
      'سطح مورد جستجو؛ `ANY` یعنی ابتدا زیرشاخه و در صورت نبود نتیجه، زیردسته',
  })
  @IsOptional()
  @IsIn(['SUB', 'TAG', 'ANY'])
  level?: 'SUB' | 'TAG' | 'ANY';

  @ApiPropertyOptional({ description: 'شناسه‌ی دسته‌ی اصلی (کسب‌وکار)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  categoryId?: string;

  @ApiPropertyOptional({ description: 'شناسه‌ی گره‌ی والد (زیردسته) برای زیرشاخه' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  parentId?: string;

  @ApiPropertyOptional({ description: 'نام گره‌ی والد، وقتی شناسه در دسترس نیست' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  parentName?: string;

  @ApiPropertyOptional({ description: 'متن جستجو' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @ApiPropertyOptional({ description: 'حداکثر نتایج (۱ تا ۵۰)', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
