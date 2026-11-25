import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const TASK_KINDS = ['CLEANING', 'MAINTENANCE', 'OTHER'] as const;
export const TASK_STATUSES = ['OPEN', 'DONE', 'CANCELLED'] as const;

export class CreateTaskDto {
  @ApiProperty({ example: 'نظافت پس از خروج مهمان' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ enum: TASK_KINDS, default: 'CLEANING' })
  @IsOptional()
  @IsIn(TASK_KINDS as unknown as string[])
  kind?: string;

  @ApiPropertyOptional({ description: 'شناسه‌ی اقامتگاه' })
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiPropertyOptional({ description: 'شناسه‌ی رزرو مرتبط' })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional({ example: '2027-04-13' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 'خانم رضایی' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  assignee?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiPropertyOptional({ enum: TASK_STATUSES })
  @IsOptional()
  @IsIn(TASK_STATUSES as unknown as string[])
  status?: string;
}
