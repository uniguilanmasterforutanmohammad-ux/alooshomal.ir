import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 'مهمان' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  guestName!: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ example: 'اقامت بسیار خوبی بود.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  @ApiPropertyOptional({ description: 'شناسه‌ی رزرو (برای تأیید اقامت)' })
  @IsOptional()
  @IsString()
  bookingId?: string;
}

export class ReplyReviewDto {
  @ApiProperty({ example: 'ممنون از حضور شما.' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  reply!: string;
}
