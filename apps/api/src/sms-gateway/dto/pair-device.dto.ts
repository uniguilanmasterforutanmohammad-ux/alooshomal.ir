import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class PairDeviceDto {
  @ApiProperty({
    description: 'کد اتصال یک‌بارمصرف که در پنل کسب‌وکار ساخته می‌شود',
    example: 'K7M2Q9XA',
  })
  @IsString()
  @Length(8, 8)
  code!: string;

  @ApiProperty({ description: 'نام دستگاه (مثلاً «گوشی فروشگاه»)', example: 'گوشی فروشگاه' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  deviceName!: string;

  @ApiPropertyOptional({ default: 'ANDROID' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  platform?: string;

  @ApiPropertyOptional({ example: '1.0.0' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  appVersion?: string;
}
