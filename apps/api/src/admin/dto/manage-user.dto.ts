import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class SetUserActiveDto {
  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  isActive!: boolean;

  @ApiPropertyOptional({ example: 'نقض قوانین استفاده' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class SetUserCommentDto {
  @ApiPropertyOptional({ example: 'کاربر فعال و معتبر' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string | null;
}

export class SetUserRoleDto {
  @ApiPropertyOptional({ enum: ['USER', 'CITIZEN_REPORTER', 'ADMIN'] })
  @IsIn(['USER', 'CITIZEN_REPORTER', 'ADMIN'])
  role!: 'USER' | 'CITIZEN_REPORTER' | 'ADMIN';
}
