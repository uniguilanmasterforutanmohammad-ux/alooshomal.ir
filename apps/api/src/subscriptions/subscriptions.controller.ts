import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ProfileCompleteGuard } from '../common/guards/profile-complete.guard';
import {
  GATEWAY_CALLBACK_BODY_SCHEMA,
  parseGatewayCallback,
  type GatewayCallbackPayload,
} from '../payping/gateway-callback';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsPaymentService } from './subscriptions-payment.service';
import { CheckoutSubscriptionDto } from './dto/checkout-subscription.dto';
import { RequestSubscriptionDto } from './dto/request-subscription.dto';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly payments: SubscriptionsPaymentService,
  ) {}

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
  @UseGuards(ProfileCompleteGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'درخواست اشتراک جدید (در انتظار تأیید مدیر)' })
  request(@CurrentUser() user: AuthUser, @Body() dto: RequestSubscriptionDto) {
    return this.subscriptionsService.requestSubscription(user.id, dto);
  }

  @Post(':id/activate')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'فعال‌سازی اشتراک پرداخت‌شده‌ای که در انتظار تأیید کاربر است (خرید طرح دیگر پیش از پایان دوره‌ی فعلی)',
  })
  activate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.subscriptionsService.activatePaidPending(user.id, id);
  }

  @Post(':planId/checkout')
  @UseGuards(ProfileCompleteGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'شروع پرداخت آنلاین اشتراک با درگاه پی‌پینگ؛ `months` دوره را تعیین می‌کند (۱/۳/۶/۱۲) و مبلغ با تخفیف دوره محاسبه می‌شود',
  })
  checkout(
    @CurrentUser() user: AuthUser,
    @Param('planId') planId: string,
    @Body() dto: CheckoutSubscriptionDto,
  ) {
    return this.payments.checkout(
      user.id,
      planId,
      dto?.months ?? 1,
      dto?.returnTo,
    );
  }

  /**
   * Public return URL registered with PayPing. The gateway normally calls it
   * with a form-encoded POST (see below), but a GET with query parameters is
   * kept for older integrations and manual retries.
   */
  @Public()
  @Get('payments/callback')
  @ApiOperation({ summary: 'بازگشت GET از درگاه پی‌پینگ و تأیید پرداخت اشتراک' })
  @ApiQuery({ name: 'paymentCode', required: false })
  @ApiQuery({ name: 'refId', required: false })
  @ApiQuery({ name: 'paymentRefId', required: false })
  @ApiQuery({ name: 'clientRefId', required: false })
  async paymentCallbackGet(
    @Query() query: Record<string, unknown>,
    @Res() res: Response,
  ) {
    return this.finishPaymentCallback(parseGatewayCallback(query, null), res);
  }

  /**
   * PayPing returns the browser with a form-encoded POST (not a GET). The
   * fields live inside a JSON `data` body, so both shapes are normalised.
   */
  @Public()
  @Post('payments/callback')
  @ApiOperation({ summary: 'بازگشت POST از درگاه پی‌پینگ و تأیید پرداخت اشتراک' })
  @ApiBody({ schema: GATEWAY_CALLBACK_BODY_SCHEMA })
  async paymentCallbackPost(
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
    @Res() res: Response,
  ) {
    return this.finishPaymentCallback(parseGatewayCallback(query, body), res);
  }

  private async finishPaymentCallback(
    payload: GatewayCallbackPayload,
    res: Response,
  ) {
    const result = await this.payments.handlePaymentCallback(payload);
    res.redirect(302, result.redirectUrl);
  }
}
