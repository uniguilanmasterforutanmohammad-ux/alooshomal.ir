import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { SubscriptionsService } from './subscriptions.service';
import { RequestSubscriptionDto } from './dto/request-subscription.dto';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'فهرست اشتراک‌های فعال' })
  plans() {
    return this.subscriptionsService.listPlans(true);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'اشتراک فعلی و درخواست‌های من' })
  mine(@CurrentUser() user: AuthUser) {
    return this.subscriptionsService.mySubscriptions(user.id);
  }

  @Post('request')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'درخواست اشتراک جدید (در انتظار تأیید مدیر)' })
  request(@CurrentUser() user: AuthUser, @Body() dto: RequestSubscriptionDto) {
    return this.subscriptionsService.requestSubscription(user.id, dto);
  }

  @Post(':planId/checkout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'شروع پرداخت آنلاین اشتراک با درگاه پی‌پینگ' })
  checkout(
    @CurrentUser() user: AuthUser,
    @Param('planId') planId: string,
  ) {
    return this.subscriptionsService.checkout(user.id, planId);
  }

  /**
   * Public return URL registered with PayPing. PayPing appends `paymentCode`
   * and `refId` (and echoes `clientRefId`) to this address. We verify the
   * transaction server-side and redirect the browser to the dashboard.
   */
  @Public()
  @Get('payments/callback')
  @ApiOperation({ summary: 'بازگشت از درگاه پی‌پینگ و تأیید پرداخت اشتراک' })
  @ApiQuery({ name: 'paymentCode', required: false })
  @ApiQuery({ name: 'refId', required: false })
  @ApiQuery({ name: 'paymentRefId', required: false })
  @ApiQuery({ name: 'clientRefId', required: false })
  async paymentCallback(
    @Query('paymentCode') paymentCode: string | undefined,
    @Query('code') code: string | undefined,
    @Query('refId') refId: string | undefined,
    @Query('paymentRefId') paymentRefId: string | undefined,
    @Query('refid') refid: string | undefined,
    @Query('clientRefId') clientRefId: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.subscriptionsService.handlePaymentCallback({
      paymentCode: paymentCode ?? code,
      refId: refId ?? paymentRefId ?? refid,
      clientRefId,
    });
    res.redirect(302, result.redirectUrl);
  }
}
