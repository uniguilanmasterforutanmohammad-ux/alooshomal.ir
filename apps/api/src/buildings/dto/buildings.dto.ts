import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const BUILDING_UNIT_STATUSES = ['OCCUPIED', 'VACANT'] as const;
export const BUILDING_PAYMENT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export const BUILDING_PAYMENT_METHODS = ['CARD_TO_CARD', 'CASH', 'TRANSFER'] as const;
export const BUILDING_TICKET_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'DONE',
  'CANCELLED',
] as const;
export const BUILDING_TICKET_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;

export class CreateBuildingDto {
  @ApiProperty({ example: 'برج آرامش', maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  managerName?: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  managerPhone?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateBuildingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  managerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  managerPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class CreateUnitDto {
  @ApiProperty({ example: '12' })
  @IsString()
  @MaxLength(30)
  unitNumber!: string;

  @ApiPropertyOptional({ example: '۳' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  floor?: string;

  @ApiPropertyOptional({ description: 'متراژ (متر مربع)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  area?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  ownerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  ownerPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  residentName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  residentPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  occupancyStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  occupancyEnd?: string;

  @ApiPropertyOptional({ enum: BUILDING_UNIT_STATUSES, default: 'OCCUPIED' })
  @IsOptional()
  @IsIn(BUILDING_UNIT_STATUSES as unknown as string[])
  status?: string;
}

export class UpdateUnitDto extends CreateUnitDto {}

export class CreateChargeDto {
  @ApiProperty({ description: 'شناسه‌ی ساختمان' })
  @IsString()
  buildingId!: string;

  @ApiProperty({ description: 'شناسه‌ی واحد' })
  @IsString()
  unitId!: string;

  @ApiProperty({ example: 'شارژ ماهانه' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @ApiPropertyOptional({ example: '1405-09' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  period?: string;

  @ApiProperty({ description: 'مبلغ (تومان)' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class BulkChargeDto {
  @ApiProperty({ description: 'شناسه‌ی ساختمان' })
  @IsString()
  buildingId!: string;

  @ApiProperty({ example: 'شارژ ماهانه' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @ApiPropertyOptional({ example: '1405-09' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  period?: string;

  @ApiPropertyOptional({ description: 'مبلغ ثابت هر واحد (تومان)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amountPerUnit?: number;

  @ApiPropertyOptional({ description: 'مبلغ به ازای هر متر مربع (تومان)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amountPerSqm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class UpdateChargeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ enum: ['UNPAID', 'PARTIAL', 'PAID', 'CANCELLED'] })
  @IsOptional()
  @IsIn(['UNPAID', 'PARTIAL', 'PAID', 'CANCELLED'])
  status?: string;
}

export class CreatePaymentDto {
  @ApiProperty({ description: 'شناسه‌ی ساختمان' })
  @IsString()
  buildingId!: string;

  @ApiProperty({ description: 'شناسه‌ی واحد' })
  @IsString()
  unitId!: string;

  @ApiPropertyOptional({ description: 'شناسه‌ی شارژ مرتبط' })
  @IsOptional()
  @IsString()
  chargeId?: string;

  @ApiProperty({ description: 'مبلغ واریزی (تومان)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional({ enum: BUILDING_PAYMENT_METHODS, default: 'CARD_TO_CARD' })
  @IsOptional()
  @IsIn(BUILDING_PAYMENT_METHODS as unknown as string[])
  method?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  trackingNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(600)
  receiptUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paidAt?: string;
}

export class ReviewPaymentDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewNote?: string;
}

export class CreateExpenseDto {
  @ApiProperty({ description: 'شناسه‌ی ساختمان' })
  @IsString()
  buildingId!: string;

  @ApiProperty({ example: 'تعمیر آسانسور' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @ApiProperty({ description: 'مبلغ (تومان)' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  vendor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(600)
  receiptUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CreateTicketDto {
  @ApiProperty({ description: 'شناسه‌ی ساختمان' })
  @IsString()
  buildingId!: string;

  @ApiPropertyOptional({ description: 'شناسه‌ی واحد (اختیاری)' })
  @IsOptional()
  @IsString()
  unitId?: string;

  @ApiProperty({ example: 'خرابی آسانسور' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: BUILDING_TICKET_PRIORITIES, default: 'NORMAL' })
  @IsOptional()
  @IsIn(BUILDING_TICKET_PRIORITIES as unknown as string[])
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  assignee?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(600)
  photoUrl?: string;
}

export class UpdateTicketDto {
  @ApiPropertyOptional({ enum: BUILDING_TICKET_STATUSES })
  @IsOptional()
  @IsIn(BUILDING_TICKET_STATUSES as unknown as string[])
  status?: string;

  @ApiPropertyOptional({ enum: BUILDING_TICKET_PRIORITIES })
  @IsOptional()
  @IsIn(BUILDING_TICKET_PRIORITIES as unknown as string[])
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  assignee?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
