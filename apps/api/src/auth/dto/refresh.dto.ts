import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RefreshDto {
  /**
   * Optional: browsers send the refresh token in the HttpOnly cookie, so the
   * body can stay empty. Non-browser API clients may still pass it here.
   */
  @ApiPropertyOptional({ description: 'Refresh token (API clients without cookies)' })
  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  refreshToken?: string;
}
