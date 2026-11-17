import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const BOOKING_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'DECLINED',
  'CANCELLED',
  'COMPLETED',
] as const;

export class UpdateBookingStatusDto {
  @ApiProperty({ enum: BOOKING_STATUSES })
  @IsIn(BOOKING_STATUSES as unknown as string[])
  status!: string;
}
