import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionStatus } from '@prisma/client';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class DecideSubscriptionDto {
  @ApiProperty({ enum: [SubscriptionStatus.ACTIVE, SubscriptionStatus.REJECTED] })
  @IsIn([SubscriptionStatus.ACTIVE, SubscriptionStatus.REJECTED])
  status!: 'ACTIVE' | 'REJECTED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  adminNote?: string;
}
