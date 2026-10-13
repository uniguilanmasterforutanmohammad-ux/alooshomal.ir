import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { clientIp, clientUserAgent } from '../sessions/request-context';
import { RefreshDto } from './dto/refresh.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestCodeDto } from './dto/request-code.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'ثبت‌نام کاربر جدید' })
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, {
      userAgent: clientUserAgent(req),
      ip: clientIp(req),
    });
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'ورود با ایمیل و رمز عبور' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, {
      userAgent: clientUserAgent(req),
      ip: clientIp(req),
    });
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'تمدید نشست با رفرش توکن (چرخش توکن)' })
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.authService.refresh(dto.refreshToken, {
      userAgent: clientUserAgent(req),
      ip: clientIp(req),
    });
  }

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'خروج از نشست فعلی' })
  logout(@CurrentUser() user: AuthUser) {
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
  verifyPhone(@Body() dto: VerifyPhoneDto, @Req() req: Request) {
    return this.authService.verifyPhoneCode(dto, {
      userAgent: clientUserAgent(req),
      ip: clientIp(req),
    });
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
