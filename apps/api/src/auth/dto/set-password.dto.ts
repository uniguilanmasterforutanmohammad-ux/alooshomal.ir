import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SetPasswordDto {
  @ApiProperty({ example: 'StrongPass123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'رمز عبور باید حداقل ۸ کاراکتر باشد' })
  @MaxLength(72)
  password!: string;

  /**
   * Required when the account already has a password: changing an existing
   * password must prove knowledge of the current one, so a stolen session
   * alone cannot lock the owner out.
   */
  @ApiPropertyOptional({ example: 'OldPass123' })
  @IsOptional()
  @IsString()
  @MaxLength(72)
  currentPassword?: string;
}
