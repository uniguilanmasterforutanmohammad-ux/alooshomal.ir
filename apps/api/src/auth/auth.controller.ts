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
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';
import { VerifyEmailLoginDto } from './dto/verify-email-login.dto';

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
  @ApiOperation({
    summary: 'ثبت‌نام کاربر با ایمیل و رمز عبور (مرحله ۱: ارسال کد یکبارمصرف)',
  })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    // Step 1 creates the pending account and issues the code; the session is
    // only created by `register/verify`.
    return this.authService.register(dto, {
      userAgent: clientUserAgent(req),
      ip: clientIp(req),
    });
  }

  @Public()
  @Post('register/verify')
  @HttpCode(200)
  @ApiOperation({
    summary: 'تأیید کد یکبارمصرف ثبت‌نام و صدور نشست',
  })
  async verifyRegister(
    @Body() dto: VerifyEmailLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const payload = await this.authService.verifyRegister(dto, {
      userAgent: clientUserAgent(req),
      ip: clientIp(req),
    });
    return this.withRefreshCookie(res, payload);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'ورود کاربران با ایمیل و رمز عبور (مرحله ۱: ارسال کد یکبارمصرف)',
  })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    // Step 1 issues the OTP only — there is no session (and no refresh token)
    // to put in a cookie until `login/verify` succeeds.
    return this.authService.login(dto, {
      userAgent: clientUserAgent(req),
      ip: clientIp(req),
    });
  }

  @Public()
  @Post('login/verify')
  @HttpCode(200)
  @ApiOperation({
    summary: 'تأیید کد یکبارمصرف ورود کاربران و صدور نشست',
  })
  async verifyEmailLogin(
    @Body() dto: VerifyEmailLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const payload = await this.authService.verifyEmailLogin(dto, {
      userAgent: clientUserAgent(req),
      ip: clientIp(req),
    });
    return this.withRefreshCookie(res, payload);
  }

  @Public()
  @Post('email')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'ورود یا ثبت‌نام یک‌مرحله‌ای با ایمیل و رمز عبور (ارسال کد یکبارمصرف)',
  })
  emailStart(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.emailStart(dto, {
      userAgent: clientUserAgent(req),
      ip: clientIp(req),
    });
  }

  // -------------------------------------------------------------------------
  //  Admin / manager sign-in — a separate page (`/jga4rm8j/login`)
  // -------------------------------------------------------------------------

  @Public()
  @Post('admin/login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'ورود مدیران با ایمیل و رمز عبور (مرحله ۱: ارسال کد یکبارمصرف)',
  })
  adminLogin(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.adminLogin(dto, {
      userAgent: clientUserAgent(req),
      ip: clientIp(req),
    });
  }

  @Public()
  @Post('admin/login/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'تأیید کد یکبارمصرف ورود مدیران و صدور نشست' })
  async verifyAdminLogin(
    @Body() dto: VerifyEmailLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const payload = await this.authService.verifyAdminLogin(dto, {
      userAgent: clientUserAgent(req),
      ip: clientIp(req),
    });
    return this.withRefreshCookie(res, payload);
  }

  @Public()
  @Post('admin/phone/request-code')
  @HttpCode(200)
  @ApiOperation({
    summary: 'ارسال کد یکبارمصرف به موبایل مدیر (فقط حساب‌های مدیریتی)',
  })
  requestAdminPhoneCode(@Body() dto: RequestCodeDto, @Req() req: Request) {
    return this.authService.requestAdminPhoneCode(dto, clientIp(req));
  }

  @Public()
  @Post('admin/phone/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'تأیید کد موبایل مدیر و صدور نشست' })
  async verifyAdminPhone(
    @Body() dto: VerifyPhoneDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const payload = await this.authService.verifyAdminPhoneCode(dto, {
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
  requestPhoneCode(@Body() dto: RequestCodeDto, @Req() req: Request) {
    return this.authService.requestPhoneCode(dto, clientIp(req));
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
    return this.authService.setPassword(user.id, dto.password, dto.currentPassword);
  }

  @Post('password/request-code')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'ارسال کد تأیید برای تغییر رمز (ایمیل و در صورت درخواست پیامک)',
  })
  requestPasswordResetCode(
    @CurrentUser() user: AuthUser,
    @Body() dto: RequestPasswordResetDto,
  ) {
    return this.authService.requestPasswordResetCode(
      user.id,
      dto.sendToPhone === true,
    );
  }

  @Post('password/reset')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'تغییر رمز عبور با کد یکبارمصرف (بدون نیاز به رمز قبلی)',
  })
  resetPassword(@CurrentUser() user: AuthUser, @Body() dto: ResetPasswordDto) {
    return this.authService.resetPasswordWithOtp(
      user.id,
      dto.code,
      dto.password,
    );
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'اطلاعات کاربر جاری' })
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
