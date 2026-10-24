import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { NewsStatus } from '@prisma/client';

import { PaginationDto } from '../../common/dto/pagination.dto';

/** Extracts the Aparat hash from a full URL or accepts a bare hash. */
export const APARAT_ID_PATTERN = /^[A-Za-z0-9_-]{6,32}$/;

export class CreateBlogPostDto {
  @ApiProperty({ example: 'راهنمای کامل ساخت کارت ویزیت دیجیتال' })
  @IsString()
  @MinLength(4)
  @MaxLength(180)
  title!: string;

  @ApiPropertyOptional({ description: 'نامک (slug)؛ در صورت نبود از عنوان ساخته می‌شود' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  slug?: string;

  @ApiPropertyOptional({ example: 'خلاصه‌ی یک‌خطی مطلب' })
  @IsOptional()
  @IsString()
  @MaxLength(320)
  excerpt?: string;

  @ApiPropertyOptional({ description: 'متن کامل مطلب (HTML محدود)' })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  content?: string;

  @ApiPropertyOptional({ description: 'آدرس تصویر کاور' })
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiPropertyOptional({ description: 'شناسه دسته‌بندی بلاگ' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'برچسب‌ها', type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description:
      'شناسه ویدیوی آپارات (هش در aparat.com/v/<id>) یا آدرس کامل ویدیو',
    example: 'abc123xyz',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  videoId?: string;

  @ApiPropertyOptional({ description: 'آدرس کامل ویدیوی آپارات (جایگزین videoId)' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  videoUrl?: string;

  @ApiPropertyOptional({ enum: ['APARAT'], default: 'APARAT' })
  @IsOptional()
  @IsString()
  videoProvider?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ enum: NewsStatus })
  @IsOptional()
  @IsEnum(NewsStatus)
  status?: NewsStatus;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateBlogPostDto extends CreateBlogPostDto {}

export class ListBlogQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'جست‌وجو در عنوان و متن' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @ApiPropertyOptional({ description: 'شناسه دسته‌بندی' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'فقط مطلب شاخص' })
  @IsOptional()
  @IsString()
  featured?: string;

  @ApiPropertyOptional({ enum: NewsStatus })
  @IsOptional()
  @IsEnum(NewsStatus)
  status?: NewsStatus;
}

export class CreateBlogCategoryDto {
  @ApiProperty({ example: 'آموزش' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slugPattern?: string;
}

/** Normalises whatever the admin typed into a clean Aparat video id. */
export function normalizeAparatId(input: {
  videoId?: string;
  videoUrl?: string;
} = {}): string | null {
  const raw = (input.videoId ?? '').trim();
  if (APARAT_ID_PATTERN.test(raw)) return raw;
  const url = (input.videoUrl ?? '').trim() || raw;
  if (!url) return null;
  // https://www.aparat.com/v/abc123  or  /v/abc123  or ...?v=abc123
  const match =
    url.match(/aparat\.com\/v\/([A-Za-z0-9_-]+)/i) ??
    url.match(/[?&]v=([A-Za-z0-9_-]+)/i) ??
    url.match(/^([A-Za-z0-9_-]{6,32})$/);
  return match ? match[1] : null;
}

/** Slugifies a Persian/English title for use in a URL. */
export function slugifyTitle(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[\s\u200c]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base || `post-${Date.now()}`;
}
