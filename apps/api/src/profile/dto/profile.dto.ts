import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RequestProfileChangeDto {
  @ApiProperty({ example: 'علی رضایی' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;
}

export class DecideProfileChangeDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsString()
  decision!: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ example: 'نام نامناسب است' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
