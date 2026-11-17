import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const DEPOSIT_STATUSES = ['NONE', 'PENDING', 'PAID', 'REFUNDED'] as const;

export class UpdateDepositDto {
  @ApiProperty({ enum: DEPOSIT_STATUSES })
  @IsIn(DEPOSIT_STATUSES as unknown as string[])
  status!: string;
}
