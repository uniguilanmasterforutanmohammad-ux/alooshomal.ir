import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { MODERATOR_SCOPES } from '../../auth/moderator-scopes';

export class CreateModeratorDto {
  @ApiProperty({ example: 'moderator@example.com' })
  @IsEmail({}, { message: 'ایمیل معتبر نیست' })
  email!: string;

  @ApiProperty({ example: 'StrongPass123' })
  @IsString()
  @MinLength(8, { message: 'رمز عبور باید حداقل ۸ کاراکتر باشد' })
  password!: string;

  @ApiPropertyOptional({ example: 'سارا محمدی' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @ApiProperty({ enum: MODERATOR_SCOPES, isArray: true })
  @IsArray()
  @ArrayNotEmpty({ message: 'حداقل یک سطح دسترسی انتخاب کنید' })
  @IsIn(MODERATOR_SCOPES as unknown as string[], { each: true })
  scopes!: string[];
}

export class UpdateModeratorDto {
  @ApiPropertyOptional({ enum: MODERATOR_SCOPES, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(MODERATOR_SCOPES as unknown as string[], { each: true })
  scopes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @ApiPropertyOptional({ description: 'رمز عبور جدید (در صورت تغییر)' })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'رمز عبور باید حداقل ۸ کاراکتر باشد' })
  password?: string;
}
