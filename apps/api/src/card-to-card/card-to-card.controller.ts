import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BusinessModuleGuard } from '../business-modules/business-module.guard';
import { RequireModule } from '../business-modules/require-module.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { CardToCardService } from './card-to-card.service';
import { ReviewCardPaymentDto } from './dto/review-payment.dto';
import { UpsertCardAccountDto } from './dto/upsert-account.dto';
import { VerifyCardDto } from './dto/verify-card.dto';

@ApiTags('card-to-card')
@ApiBearerAuth()
@UseGuards(BusinessModuleGuard)
@RequireModule('cardToCard')
@Controller('card-to-card')
export class CardToCardController {
  constructor(private readonly cardToCard: CardToCardService) {}

  @Get('settings')
  @ApiOperation({ summary: 'اطلاعات کارت بانکی کسب‌وکار برای کارت به کارت' })
  getSettings(@CurrentUser() user: AuthUser) {
    return this.cardToCard.getAccount(user.id);
  }

  @Put('settings')
  @ApiOperation({ summary: 'ثبت/ویرایش شماره کارت و توضیحات واریز' })
  upsertSettings(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertCardAccountDto,
  ) {
    return this.cardToCard.upsertAccount(user.id, dto);
  }

  @Get('verification')
  @ApiOperation({
    summary:
      'وضعیت استعلام کارت: محصول ترکیبی، آمادگی پروفایل و آخرین نتیجه',
  })
  verification(@CurrentUser() user: AuthUser) {
    return this.cardToCard.verificationOverview(user.id);
  }

  @Post('verification/checkout')
  @ApiOperation({
    summary:
      'شروع پرداخت استعلام ترکیبی کارت با کد ملی + تبدیل کارت به شبا',
  })
  startVerification(
    @CurrentUser() user: AuthUser,
    @Body() dto: VerifyCardDto,
  ) {
    return this.cardToCard.startVerification(user.id, dto);
  }

  @Post('verification/apply')
  @ApiOperation({
    summary: 'ثبت شبا و اطلاعات کارت از نتیجه‌ی پرداخت‌شده‌ی استعلام',
  })
  applyVerification(@CurrentUser() user: AuthUser) {
    return this.cardToCard.applyVerification(user.id);
  }

  @Get('payments')
  @ApiOperation({ summary: 'صف رسیدهای کارت به کارت (فیلتر وضعیت)' })
  listPayments(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    return this.cardToCard.listPayments(user.id, status);
  }

  @Patch('payments/:id')
  @ApiOperation({ summary: 'تأیید یا رد رسید کارت به کارت' })
  reviewPayment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReviewCardPaymentDto,
  ) {
    return this.cardToCard.reviewPayment(user.id, id, dto);
  }
}
