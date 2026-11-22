import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

/**
 * Body of the development-only admin quick-login endpoint. `method` picks
 * which identity of the local admin account to sign in with (email or phone).
 */
export class DevQuickLoginDto {
  @ApiPropertyOptional({
    enum: ['email', 'phone'],
    default: 'email',
    description: 'روش ورود سریع مدیر در محیط توسعه (فقط dev؛ در پروداکشن ۴۰۴).',
  })
  @IsOptional()
  @IsIn(['email', 'phone'])
  method?: 'email' | 'phone';
}
