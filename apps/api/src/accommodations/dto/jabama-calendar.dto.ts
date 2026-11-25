import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class JabamaCalendarQueryDto {
  @ApiProperty({
    description: 'لینک صفحه‌ی اقامتگاه جاباما (شامل /stay/)',
    example: 'https://www.jabama.com/stay/villa-835999',
    maxLength: 600,
  })
  @IsString()
  @MaxLength(600)
  url!: string;
}
