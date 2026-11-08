import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  OAuthCallbackDto,
  OAuthRequestDto,
  OAuthScopesDto,
} from './dto/payping-oauth.dto';
import { PaypingOAuthService } from './payping-oauth.service';

/**
 * Admin-only surface for the PayPing **OAuth application** (ClientId /
 * ClientSecret). Kept deliberately separate from the merchant-token panel so
 * the two integrations can be compared side by side.
 */
@ApiTags('payping-oauth')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/payping-oauth')
export class PaypingOAuthController {
  constructor(private readonly oauth: PaypingOAuthService) {}

  @Get('status')
  @ApiOperation({ summary: 'وضعیت اتصال OAuth و scopeهای درخواستی/داده‌شده' })
  status() {
    return this.oauth.status();
  }

  @Patch('scopes')
  @ApiOperation({ summary: 'تنظیم scopeهای درخواستی برای اتصال بعدی' })
  async setScopes(@Body() dto: OAuthScopesDto) {
    const requestedScopes = await this.oauth.setRequestedScopes(dto.scopes);
    return { requestedScopes };
  }

  @Post('start')
  @ApiOperation({ summary: 'ساخت آدرس مجوزدهی پی‌پینگ (authorization code + PKCE)' })
  start() {
    return this.oauth.start();
  }

  @Post('callback')
  @ApiOperation({ summary: 'تبدیل کد بازگشتی به توکن و ذخیره‌ی آن' })
  callback(@Body() dto: OAuthCallbackDto) {
    return this.oauth.callback(dto.code, dto.state);
  }

  @Post('disconnect')
  @ApiOperation({ summary: 'قطع اتصال و حذف توکن‌های ذخیره‌شده' })
  disconnect() {
    return this.oauth.disconnect();
  }

  @Get('userinfo')
  @ApiOperation({ summary: 'اطلاعات کاربر پی‌پینگ با توکن OAuth' })
  userinfo() {
    return this.oauth.userinfo();
  }

  @Get('probe')
  @ApiOperation({ summary: 'آزمایش دسترسی واقعی توکن به هر scope' })
  probe() {
    return this.oauth.probe();
  }

  @Post('request')
  @ApiOperation({ summary: 'فراخوانی خام یک مسیر مجاز پی‌پینگ با توکن OAuth' })
  request(@Body() dto: OAuthRequestDto) {
    return this.oauth.call(dto.method, dto.path, dto.body);
  }
}
