import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewRetailProductDto {
  @ApiProperty({ description: 'true = تأیید و انتشار، false = رد' })
  @IsBoolean()
  approve!: boolean;

  @ApiPropertyOptional({ description: 'دلیل رد (برای approve=false)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
