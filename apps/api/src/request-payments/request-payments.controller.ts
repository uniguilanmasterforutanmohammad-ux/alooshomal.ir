import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { Public } from '../common/decorators/public.decorator';
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
  @ApiOperation({ summary: 'بازگشت از درگاه پی‌پینگ و تأیید پرداخت درخواست پله/تبلیغ' })
  @ApiQuery({ name: 'paymentCode', required: false })
  @ApiQuery({ name: 'refId', required: false })
  @ApiQuery({ name: 'paymentRefId', required: false })
  @ApiQuery({ name: 'clientRefId', required: false })
  async callback(
    @Query('paymentCode') paymentCode: string | undefined,
    @Query('code') code: string | undefined,
    @Query('refId') refId: string | undefined,
    @Query('paymentRefId') paymentRefId: string | undefined,
    @Query('refid') refid: string | undefined,
    @Query('clientRefId') clientRefId: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.payments.handleCallback({
      paymentCode: paymentCode ?? code,
      refId: refId ?? paymentRefId ?? refid,
      clientRefId,
    });
    res.redirect(302, result.redirectUrl);
  }
}
