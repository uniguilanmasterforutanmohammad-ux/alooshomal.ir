import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { clientIp, clientUserAgent } from '../sessions/request-context';
import { RefreshDto } from './dto/refresh.dto';
import {
  clearRefreshCookie,
  readRefreshCookie,
  setRefreshCookie,
} from './refresh-cookie';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestCodeDto } from './dto/request-code.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Moves the refresh token from the JSON body into the HttpOnly cookie and
   * strips it from the response, so it is never exposed to client-side JS.
   */
  private withRefreshCookie<T extends { refreshToken?: string }>(
    res: Response,
    payload: T,
  ): Omit<T, 'refreshToken'> {
    if (payload.refreshToken) {
      setRefreshCookie(res, payload.refreshToken);
    }
    const { refreshToken: _drop, ...rest } = payload;
    return rest;
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'ثبت‌نام کاربر جدید' })
  async register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const payload = await this.authService.register(dto, {
      userAgent: clientUserAgent(req),
      ip: clientIp(req),
    });
    return this.withRefreshCookie(res, payload);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'ورود با ایمیل و رمز عبور' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const payload = await this.authService.login(dto, {
      userAgent: clientUserAgent(req),
      ip: clientIp(req),
    });
    return this.withRefreshCookie(res, payload);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'تمدید نشست با رفرش توکن (چرخش توکن)' })
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Prefer the HttpOnly cookie; fall back to the body for API clients that
    // cannot use cookies yet.
    const token = readRefreshCookie(req) ?? dto.refreshToken ?? '';
    const payload = await this.authService.refresh(token, {
      userAgent: clientUserAgent(req),
      ip: clientIp(req),
    });
    return this.withRefreshCookie(res, payload);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'خروج از نشست فعلی' })
  async logout(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    clearRefreshCookie(res);
    return this.authService.logout(user.id, user.sessionId);
  }

  @Public()
  @Post('phone/request-code')
  @HttpCode(200)
  @ApiOperation({ summary: 'ارسال کد یکبار مصرف به موبایل' })
  requestPhoneCode(@Body() dto: RequestCodeDto) {
    return this.authService.requestPhoneCode(dto);
  }

  @Public()
  @Post('phone/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'تأیید کد موبایل و ورود/ثبت‌نام' })
  async verifyPhone(
    @Body() dto: VerifyPhoneDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const payload = await this.authService.verifyPhoneCode(dto, {
      userAgent: clientUserAgent(req),
      ip: clientIp(req),
    });
    return this.withRefreshCookie(res, payload);
  }

  @Post('set-password')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ثبت/تغییر رمز عبور کاربر جاری' })
  setPassword(@CurrentUser() user: AuthUser, @Body() dto: SetPasswordDto) {
    return this.authService.setPassword(user.id, dto.password);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'اطلاعات کاربر جاری' })
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
