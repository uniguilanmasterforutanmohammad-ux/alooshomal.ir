import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTaxonomyNodeDto {
  @ApiProperty({ example: 'کافه و رستوران' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ enum: ['SUB', 'TAG'], example: 'SUB' })
  @IsIn(['SUB', 'TAG'])
  level!: 'SUB' | 'TAG';

  @ApiPropertyOptional({
    description: 'برای زیرشاخه (TAG): شناسه‌ی زیردسته‌ی والد',
  })
  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UpdateTaxonomyNodeDto {
  @ApiPropertyOptional({ example: 'کافه و رستوران' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
