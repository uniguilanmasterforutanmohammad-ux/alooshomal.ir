import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

/** Body of `POST /admin/payping-oauth/callback`. */
export class OAuthCallbackDto {
  @ApiProperty({ description: 'کد بازگشتی از پی‌پینگ (query: code)' })
  @IsString()
  @MinLength(1)
  code!: string;

  @ApiProperty({ description: 'وضعیت بازگشتی (query: state)' })
  @IsString()
  @MinLength(1)
  state!: string;
}

/** Body of `PATCH /admin/payping-oauth/scopes`. */
export class OAuthScopesDto {
  @ApiProperty({
    description:
      'فهرست scopeهای درخواستی، جداشده با فاصله (مثلاً «openid profile pay:read»)',
    example: 'openid profile email pay:read pay:write offline_access',
  })
  @IsString()
  @MinLength(1)
  scopes!: string;
}

/** Body of `POST /admin/payping-oauth/request` (raw API tester). */
export class OAuthRequestDto {
  @ApiProperty({
    description: 'متد HTTP',
    enum: ['GET', 'POST', 'PUT', 'DELETE'],
  })
  @IsIn(['GET', 'POST', 'PUT', 'DELETE'])
  method!: 'GET' | 'POST' | 'PUT' | 'DELETE';

  @ApiProperty({
    description: 'مسیر API پی‌پینگ (با / شروع شود)',
    example: '/v1/customer/ListCount',
  })
  @IsString()
  @MinLength(2)
  path!: string;

  @ApiPropertyOptional({ description: 'بدنه‌ی JSON (اختیاری)' })
  @IsOptional()
  body?: unknown;
}
