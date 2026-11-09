import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class VoidInvoiceDto {
  @ApiPropertyOptional({ example: 'بازگشت وجه به مشتری' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
