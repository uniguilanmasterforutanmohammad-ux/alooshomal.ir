import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SetIndustryDto {
  @ApiProperty({
    description: 'کلید بسته‌ی صنف (از `GET /business-modules/my`)',
    example: 'dailyRental',
  })
  @IsString()
  @MinLength(1)
  industryKey!: string;
}
