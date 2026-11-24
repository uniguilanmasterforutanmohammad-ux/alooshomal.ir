import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BusinessModuleGuard } from '../business-modules/business-module.guard';
import { RequireModule } from '../business-modules/require-module.decorator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateEduPaymentDto, ReviewEduPaymentDto } from './dto/education.dto';
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
}
