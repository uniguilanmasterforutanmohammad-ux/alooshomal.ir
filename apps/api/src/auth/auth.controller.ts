import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestCodeDto } from './dto/request-code.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'ثبت‌نام کاربر جدید' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'ورود با ایمیل و رمز عبور' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
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
  verifyPhone(@Body() dto: VerifyPhoneDto) {
    return this.authService.verifyPhoneCode(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'اطلاعات کاربر جاری' })
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
