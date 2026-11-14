import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { NewsStatus } from '@prisma/client';
import type { Response } from 'express';

import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import {
  DecideProfileChangeDto,
  IdentityCheckoutDto,
  MatchIdentityPhoneDto,
  RequestContactOtpDto,
  RequestProfileChangeDto,
  UpdateIdentityDto,
  VerifyContactChangeDto,
} from './dto/profile.dto';
import { ProfileService } from './profile.service';

@ApiTags('profile')
@ApiBearerAuth()
@Controller('profile')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get('me')
  @ApiOperation({ summary: 'پروفایل من + آخرین درخواست تغییر' })
  me(@CurrentUser() user: AuthUser) {
    return this.profile.me(user.id);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'ثبت/ویرایش مشخصات هویتی (نام، نام خانوادگی، کد ملی)',
  })
  updateIdentity(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateIdentityDto,
  ) {
    return this.profile.updateIdentity(user.id, dto);
  }

  @Get('identity/status')
  @ApiOperation({
    summary: 'وضعیت دو مرحله‌ی استعلام هویت (شاهکار و استعلام اطلاعات)',
  })
  identityStatus(@CurrentUser() user: AuthUser) {
    return this.profile.me(user.id);
  }

  @Post('identity/phone-match')
  @ApiOperation({
    summary: 'مرحله ۱: تطبیق کد ملی با شماره موبایل (شاهکار) + ثبت تاریخ تولد',
  })
  matchIdentityPhone(
    @CurrentUser() user: AuthUser,
    @Body() dto: MatchIdentityPhoneDto,
  ) {
    return this.profile.matchIdentityPhone(user.id, dto);
  }

  @Post('identity/inquiry')
  @ApiOperation({
    summary: 'مرحله ۲: استعلام اطلاعات هویتی و ذخیره‌ی نام/نام پدر',
  })
  inquiryIdentity(@CurrentUser() user: AuthUser) {
    return this.profile.inquiryIdentity(user.id);
  }

  @Post('identity/checkout')
  @ApiOperation({
    summary:
      'شروع پرداخت آنلاین استعلام هویت (شاهکار + هویتی) به‌صورت یک محصول واحد',
  })
  identityCheckout(
    @CurrentUser() user: AuthUser,
    @Body() dto: IdentityCheckoutDto,
  ) {
    return this.profile.identityCheckout(user.id, dto);
  }

  @Post('identity/verify')
  @ApiOperation({
    summary: 'اجرای استعلام هویت پس از پرداخت موفق (بدون کسر مجدد)',
  })
  verifyIdentityPayment(@CurrentUser() user: AuthUser) {
    return this.profile.verifyIdentityPayment(user.id);
  }

  @Public()
  @Get('identity/payments/callback')
  @ApiOperation({ summary: 'بازگشت از درگاه و تأیید پرداخت استعلام هویت' })
  @ApiQuery({ name: 'paymentCode', required: false })
  @ApiQuery({ name: 'refId', required: false })
  @ApiQuery({ name: 'clientRefId', required: false })
  async identityPaymentCallback(
    @Query('paymentCode') paymentCode: string | undefined,
    @Query('code') code: string | undefined,
    @Query('refId') refId: string | undefined,
    @Query('paymentRefId') paymentRefId: string | undefined,
    @Query('clientRefId') clientRefId: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.profile.handleIdentityPaymentCallback({
      paymentCode: paymentCode ?? code,
      refId: refId ?? paymentRefId,
      clientRefId,
    });
    res.redirect(302, result.redirectUrl);
  }

  @Post('change-request')
  @RequirePermission('PROFILE_CHANGE_REQUEST')
  @ApiOperation({ summary: 'ثبت درخواست تغییر پروفایل (نیازمند تأیید مدیر)' })
  request(@CurrentUser() user: AuthUser, @Body() dto: RequestProfileChangeDto) {
    return this.profile.requestChange(user.id, dto.fullName);
  }

  @Get('change-request/mine')
  @ApiOperation({ summary: 'آخرین درخواست تغییر پروفایل من' })
  latestMine(@CurrentUser() user: AuthUser) {
    return this.profile.latestMine(user.id);
  }

  // --- verified phone change ---

  @Post('phone/request-code')
  @ApiOperation({ summary: 'ارسال کد تأیید به شماره‌ی جدید برای تغییر موبایل' })
  requestPhoneChange(
    @CurrentUser() user: AuthUser,
    @Body() dto: RequestContactOtpDto,
  ) {
    return this.profile.requestPhoneChange(user.id, dto.phone ?? '');
  }

  @Post('phone/verify')
  @ApiOperation({ summary: 'تأیید کد و تغییر شماره موبایل' })
  verifyPhoneChange(
    @CurrentUser() user: AuthUser,
    @Body() dto: VerifyContactChangeDto,
  ) {
    return this.profile.verifyPhoneChange(user.id, dto.phone ?? '', dto.code);
  }

  // --- verified email change ---

  @Post('email/request-code')
  @ApiOperation({ summary: 'ارسال کد تأیید به ایمیل جدید برای تغییر ایمیل' })
  requestEmailChange(
    @CurrentUser() user: AuthUser,
    @Body() dto: RequestContactOtpDto,
  ) {
    return this.profile.requestEmailChange(user.id, dto.email ?? '');
  }

  @Post('email/verify')
  @ApiOperation({ summary: 'تأیید کد و اعمال فوری تغییر ایمیل' })
  verifyEmailChange(
    @CurrentUser() user: AuthUser,
    @Body() dto: VerifyContactChangeDto,
  ) {
    return this.profile.verifyEmailChange(user.id, dto.email ?? '', dto.code);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/profile-requests')
export class AdminProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'درخواست‌های تغییر پروفایل' })
  list(@Query('status') status?: NewsStatus) {
    return this.profile.listRequests(status);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تأیید/رد درخواست تغییر پروفایل' })
  decide(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: DecideProfileChangeDto,
  ) {
    const decision =
      dto.decision === 'APPROVED' ? NewsStatus.APPROVED : NewsStatus.REJECTED;
    return this.profile.decide(admin.id, id, decision, dto.reason);
  }
}
