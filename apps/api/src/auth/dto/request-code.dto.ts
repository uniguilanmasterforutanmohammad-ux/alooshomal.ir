import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';

export class RequestCodeDto {
  @ApiProperty({ example: '09123456789' })
  @IsString()
  @MaxLength(20)
  @Matches(/^[0-9+\u06F0-\u06F9\u0660-\u0669\s-]+$/, {
    message: 'شماره موبایل معتبر نیست',
  })
  phone!: string;
}
