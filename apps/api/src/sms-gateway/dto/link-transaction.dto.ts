import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LinkTransactionDto {
  @ApiProperty({ description: 'شناسه سفارشی که این واریزی به آن وصل می‌شود' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  orderId!: string;

  @ApiPropertyOptional({ description: 'توضیح مدیر برای این تطبیق دستی' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class IgnoreTransactionDto {
  @ApiPropertyOptional({ description: 'دلیل نادیده‌گرفتن این پیامک' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
