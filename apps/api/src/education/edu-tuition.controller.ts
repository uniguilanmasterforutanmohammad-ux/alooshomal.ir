import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BusinessModuleGuard } from '../business-modules/business-module.guard';
import { RequireModule } from '../business-modules/require-module.decorator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import {
  CreateEduPaymentDto,
  CreateInstallmentDto,
  ReviewEduPaymentDto,
  UpdateInstallmentDto,
} from './dto/education.dto';
import { EducationService } from './education.service';

@ApiTags('education')
@ApiBearerAuth()
@UseGuards(BusinessModuleGuard)
@RequireModule('eduTuition')
@Controller('edu-tuition')
export class EduTuitionController {
  constructor(private readonly education: EducationService) {}

  @Get('balances')
  @ApiOperation({ summary: 'مانده شهریه‌ی هر ثبت‌نام (شهریه، تخفیف، پرداخت‌شده، بدهی)' })
  balances(@CurrentUser() user: AuthUser) {
    return this.education.listBalances(user.id);
  }

  @Get('payments')
  @ApiOperation({ summary: 'فهرست پرداخت‌ها و رسیدهای شهریه' })
  payments(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('enrollmentId') enrollmentId?: string,
  ) {
    return this.education.listPayments(user.id, { status, enrollmentId });
  }

  @Post('payments')
  @ApiOperation({ summary: 'ثبت پرداخت/رسید شهریه (تکرار شماره پیگیری ۴۰۹)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEduPaymentDto) {
    return this.education.createPayment(user.id, dto);
  }

  @Patch('payments/:id')
  @ApiOperation({ summary: 'تأیید/رد رسید شهریه (رسید به‌تنهایی تسویه نیست)' })
  review(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReviewEduPaymentDto,
  ) {
    return this.education.reviewPayment(user.id, id, dto);
  }

  @Get('installments')
  @ApiOperation({ summary: 'فهرست اقساط شهریه (فیلتر ثبت‌نام)' })
  installments(
    @CurrentUser() user: AuthUser,
    @Query('enrollmentId') enrollmentId?: string,
  ) {
    return this.education.listInstallments(user.id, enrollmentId);
  }

  @Post('installments')
  @ApiOperation({ summary: 'زمان‌بندی قسط جدید برای ثبت‌نام' })
  createInstallment(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateInstallmentDto,
  ) {
    return this.education.createInstallment(user.id, dto);
  }

  @Patch('installments/:id')
  @ApiOperation({ summary: 'ویرایش/علامت‌گذاری پرداخت قسط' })
  updateInstallment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateInstallmentDto,
  ) {
    return this.education.updateInstallment(user.id, id, dto);
  }

  @Delete('installments/:id')
  @ApiOperation({ summary: 'حذف قسط' })
  removeInstallment(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.education.removeInstallment(user.id, id);
  }

  @Get('reminders')
  @ApiOperation({ summary: 'اقساط سررسیدشده یا نزدیک سررسید (۷ روز)' })
  reminders(@CurrentUser() user: AuthUser) {
    return this.education.installmentReminders(user.id);
  }

  @Get('export/payments')
  @ApiOperation({ summary: 'خروجی CSV پرداخت‌های شهریه (حسابداری/اکسل)' })
  async exportPayments(
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const csv = await this.education.exportPaymentsCsv(user.id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="edu-payments.csv"');
    res.send(csv);
  }
}
