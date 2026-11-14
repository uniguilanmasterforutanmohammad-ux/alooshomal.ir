import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { Public } from '../common/decorators/public.decorator';
import {
  GATEWAY_CALLBACK_BODY_SCHEMA,
  parseGatewayCallback,
  type GatewayCallbackPayload,
} from '../payping/gateway-callback';
import { RequestPaymentsService } from './request-payments.service';

@ApiTags('payments')
@Controller('payments')
export class RequestPaymentsController {
  constructor(private readonly payments: RequestPaymentsService) {}

  /**
   * Public return URL registered with PayPing for boost/ad prepayments. PayPing
   * appends `paymentCode`/`refId` (and echoes `clientRefId`); the transaction is
   * verified server-side and the browser lands back on «افزایش بازدید».
   */
  @Public()
  @Get('request-callback')
  @ApiOperation({ summary: 'بازگشت GET از درگاه پی‌پینگ و تأیید پرداخت درخواست پله/تبلیغ' })
  @ApiQuery({ name: 'paymentCode', required: false })
  @ApiQuery({ name: 'refId', required: false })
  @ApiQuery({ name: 'paymentRefId', required: false })
  @ApiQuery({ name: 'clientRefId', required: false })
  async callbackGet(
    @Query() query: Record<string, unknown>,
    @Res() res: Response,
  ) {
    return this.finishCallback(parseGatewayCallback(query, null), res);
  }

  /** PayPing sends the result as a form-encoded POST (see gateway-callback.ts). */
  @Public()
  @Post('request-callback')
  @ApiOperation({ summary: 'بازگشت POST از درگاه پی‌پینگ و تأیید پرداخت درخواست پله/تبلیغ' })
  @ApiBody({ schema: GATEWAY_CALLBACK_BODY_SCHEMA })
  async callbackPost(
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
    @Res() res: Response,
  ) {
    return this.finishCallback(parseGatewayCallback(query, body), res);
  }

  private async finishCallback(
    payload: GatewayCallbackPayload,
    res: Response,
  ) {
    const result = await this.payments.handleCallback(payload);
    res.redirect(302, result.redirectUrl);
  }
}
