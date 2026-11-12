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
 * Query for the searchable «زیردسته»/«زیرشاخه» pickers in the biolink and
 * business-card builders. The tree is far too large for a dropdown, so the
 * client asks for a short, filtered page instead of the full list.
 */
export class SearchTaxonomyNodeDto {
  @ApiProperty({ enum: ['SUB', 'TAG'], description: 'سطح مورد جستجو' })
  @IsIn(['SUB', 'TAG'])
  level!: 'SUB' | 'TAG';

  @ApiPropertyOptional({ description: 'شناسه‌ی دسته‌ی اصلی (برای زیردسته)' })
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
