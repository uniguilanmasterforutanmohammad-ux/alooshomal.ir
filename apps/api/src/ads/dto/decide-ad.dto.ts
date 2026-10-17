import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BoostStatus } from '@prisma/client';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class DecideAdDto {
  @ApiProperty({ enum: [BoostStatus.APPROVED, BoostStatus.REJECTED] })
  @IsIn([BoostStatus.APPROVED, BoostStatus.REJECTED])
  status!: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  adminNote?: string;
}
