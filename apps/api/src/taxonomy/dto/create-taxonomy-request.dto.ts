import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Sent when a user searches the «زیردسته»/«زیرشاخه» box and no level matches
 * at all: the typed term is forwarded to the admin team so the taxonomy can be
 * extended. The builder shows the user «سایر» while this is recorded.
 */
export class CreateTaxonomyRequestDto {
  @ApiProperty({
    example: 'کافه سیار',
    description: 'عبارتی که کاربر جست‌وجو کرد و در تاکسونومی پیدا نشد',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  q!: string;

  @ApiPropertyOptional({ description: 'شناسه‌ی دسته‌ی اصلی انتخاب‌شده' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  categoryId?: string;
}
