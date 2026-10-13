import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ description: 'Refresh token issued at login' })
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  refreshToken!: string;
}
