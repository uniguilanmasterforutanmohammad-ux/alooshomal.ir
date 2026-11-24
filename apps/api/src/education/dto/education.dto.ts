import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const EDU_DISCIPLINES = ['SPORT', 'ART', 'MUSIC', 'OTHER'] as const;
export const EDU_MODES = ['PRIVATE', 'SEMI_PRIVATE', 'GROUP'] as const;
export const EDU_DELIVERIES = ['IN_PERSON', 'ONLINE', 'HYBRID'] as const;
export const EDU_CLASS_STATUSES = ['ACTIVE', 'ARCHIVED'] as const;
export const EDU_STUDENT_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export const EDU_ENROLLMENT_STATUSES = ['ACTIVE', 'COMPLETED', 'CANCELLED'] as const;
export const EDU_SESSION_STATUSES = [
  'SCHEDULED',
  'DONE',
  'CANCELLED_BY_COACH',
  'CANCELLED_BY_STUDENT',
] as const;
export const EDU_ATTENDANCE_STATUSES = [
  'PRESENT',
  'ABSENT_EXCUSED',
  'ABSENT',
  'MAKEUP',
] as const;
export const EDU_PAYMENT_METHODS = ['CARD_TO_CARD', 'CASH', 'TRANSFER'] as const;
export const EDU_PAYMENT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export const EDU_SETTLEMENT_BASES = ['FIXED', 'PER_SESSION', 'PERCENT'] as const;
export const EDU_SETTLEMENT_STATUSES = ['PENDING', 'SETTLED'] as const;
export const EDU_INSTALLMENT_STATUSES = ['PENDING', 'PAID', 'CANCELLED'] as const;
export const EDU_WAITLIST_STATUSES = ['WAITING', 'OFFERED', 'ENROLLED', 'CANCELLED'] as const;

export class CreateClassDto {
  @ApiProperty({ example: 'گیتار مقدماتی', maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @ApiPropertyOptional({ enum: EDU_DISCIPLINES, default: 'SPORT' })
  @IsOptional()
  @IsIn(EDU_DISCIPLINES)
  discipline?: (typeof EDU_DISCIPLINES)[number];

  @ApiPropertyOptional({ enum: EDU_MODES, default: 'GROUP' })
  @IsOptional()
  @IsIn(EDU_MODES)
  mode?: (typeof EDU_MODES)[number];

  @ApiPropertyOptional({ enum: EDU_DELIVERIES, default: 'IN_PERSON' })
  @IsOptional()
  @IsIn(EDU_DELIVERIES)
  delivery?: (typeof EDU_DELIVERIES)[number];

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  level?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMin?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sessionsPerPackage?: number;

  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  location?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  coachName?: string;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  prerequisites?: string;

  @ApiPropertyOptional({ enum: EDU_CLASS_STATUSES, default: 'ACTIVE' })
  @IsOptional()
  @IsIn(EDU_CLASS_STATUSES)
  status?: (typeof EDU_CLASS_STATUSES)[number];

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateClassDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ enum: EDU_DISCIPLINES })
  @IsOptional()
  @IsIn(EDU_DISCIPLINES)
  discipline?: (typeof EDU_DISCIPLINES)[number];

  @ApiPropertyOptional({ enum: EDU_MODES })
  @IsOptional()
  @IsIn(EDU_MODES)
  mode?: (typeof EDU_MODES)[number];

  @ApiPropertyOptional({ enum: EDU_DELIVERIES })
  @IsOptional()
  @IsIn(EDU_DELIVERIES)
  delivery?: (typeof EDU_DELIVERIES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  level?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sessionsPerPackage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  coachName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  prerequisites?: string;

  @ApiPropertyOptional({ enum: EDU_CLASS_STATUSES })
  @IsOptional()
  @IsIn(EDU_CLASS_STATUSES)
  status?: (typeof EDU_CLASS_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class CreateStudentDto {
  @ApiProperty({ example: 'سارا محمدی', maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  guardianName?: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  guardianPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  goal?: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  level?: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  source?: string;

  @ApiPropertyOptional({ enum: EDU_STUDENT_STATUSES, default: 'ACTIVE' })
  @IsOptional()
  @IsIn(EDU_STUDENT_STATUSES)
  status?: (typeof EDU_STUDENT_STATUSES)[number];

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nextActionAt?: string;
}

export class UpdateStudentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  guardianName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  guardianPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  goal?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  level?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  source?: string;

  @ApiPropertyOptional({ enum: EDU_STUDENT_STATUSES })
  @IsOptional()
  @IsIn(EDU_STUDENT_STATUSES)
  status?: (typeof EDU_STUDENT_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nextActionAt?: string | null;
}

export class CreateEnrollmentDto {
  @ApiProperty()
  @IsString()
  studentId!: string;

  @ApiProperty()
  @IsString()
  classId!: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  packageSessions?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class UpdateEnrollmentDto {
  @ApiPropertyOptional({ enum: EDU_ENROLLMENT_STATUSES })
  @IsOptional()
  @IsIn(EDU_ENROLLMENT_STATUSES)
  status?: (typeof EDU_ENROLLMENT_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class CreateSessionDto {
  @ApiProperty()
  @IsString()
  classId!: string;

  @ApiProperty()
  @IsDateString()
  scheduledAt!: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMin?: number;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  topic?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  coachName?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class UpdateSessionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ enum: EDU_SESSION_STATUSES })
  @IsOptional()
  @IsIn(EDU_SESSION_STATUSES)
  status?: (typeof EDU_SESSION_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  topic?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  coachName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class RecordAttendanceDto {
  @ApiProperty()
  @IsString()
  enrollmentId!: string;

  @ApiProperty({ enum: EDU_ATTENDANCE_STATUSES })
  @IsIn(EDU_ATTENDANCE_STATUSES)
  status!: (typeof EDU_ATTENDANCE_STATUSES)[number];

  @ApiPropertyOptional({ description: 'آیا این وضعیت از بسته‌ی جلسات کم می‌کند' })
  @IsOptional()
  @IsBoolean()
  consumesCredit?: boolean;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CreateProgressDto {
  @ApiProperty()
  @IsString()
  enrollmentId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  topic?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  homework?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  feedback?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  privateNote?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  mediaUrl?: string;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  nextGoal?: string;
}

export class UpdateProgressDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  topic?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  homework?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  feedback?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  privateNote?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  mediaUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  nextGoal?: string;
}

export class CreateEduPaymentDto {
  @ApiProperty()
  @IsString()
  enrollmentId!: string;

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ enum: EDU_PAYMENT_METHODS, default: 'CARD_TO_CARD' })
  @IsOptional()
  @IsIn(EDU_PAYMENT_METHODS)
  method?: (typeof EDU_PAYMENT_METHODS)[number];

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  trackingNumber?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  receiptUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paidAt?: string;
}

export class ReviewEduPaymentDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewNote?: string;
}

export class CreateEduExpenseDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  vendor?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class CreateSettlementDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  coachName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiPropertyOptional({ maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  period?: string;

  @ApiPropertyOptional({ enum: EDU_SETTLEMENT_BASES, default: 'PER_SESSION' })
  @IsOptional()
  @IsIn(EDU_SETTLEMENT_BASES)
  basis?: (typeof EDU_SETTLEMENT_BASES)[number];

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class UpdateSettlementDto {
  @ApiPropertyOptional({ enum: EDU_SETTLEMENT_STATUSES })
  @IsOptional()
  @IsIn(EDU_SETTLEMENT_STATUSES)
  status?: (typeof EDU_SETTLEMENT_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class CreateInstallmentDto {
  @ApiProperty()
  @IsString()
  enrollmentId!: string;

  @ApiProperty({ maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amount!: number;

  @ApiProperty()
  @IsDateString()
  dueDate!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateInstallmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ enum: EDU_INSTALLMENT_STATUSES })
  @IsOptional()
  @IsIn(EDU_INSTALLMENT_STATUSES)
  status?: (typeof EDU_INSTALLMENT_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class RecurringSessionDto {
  @ApiProperty()
  @IsString()
  classId!: string;

  @ApiProperty({ description: 'زمان اولین جلسه (ISO)' })
  @IsDateString()
  startAt!: string;

  @ApiProperty({ minimum: 1, maximum: 52 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  count!: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 30, default: 7, description: 'فاصله‌ی روزها' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  intervalDays?: number;

  @ApiPropertyOptional({ minimum: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  durationMin?: number;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  topic?: string;
}

export class CreateWaitlistDto {
  @ApiProperty()
  @IsString()
  classId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiProperty({ maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateWaitlistDto {
  @ApiPropertyOptional({ enum: EDU_WAITLIST_STATUSES })
  @IsOptional()
  @IsIn(EDU_WAITLIST_STATUSES)
  status?: (typeof EDU_WAITLIST_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class StudentPaymentDto {
  @ApiProperty()
  @IsString()
  enrollmentId!: string;

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  trackingNumber?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  receiptUrl?: string;
}
