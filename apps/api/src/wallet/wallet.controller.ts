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

import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  GATEWAY_CALLBACK_BODY_SCHEMA,
  parseGatewayCallback,
  type GatewayCallbackPayload,
} from '../payping/gateway-callback';
import { AdjustWalletDto, CheckoutWalletDto } from './dto/wallet.dto';
import { WalletService } from './wallet.service';

@ApiTags('wallet')
@ApiBearerAuth()
@Controller('wallet')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get('me')
  @ApiOperation({ summary: 'کیف پول من: بدهی، سررسید و گردش حساب' })
  mine(@CurrentUser() user: AuthUser) {
    return this.wallet.getMine(user.id);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'شروع پرداخت یک‌جای کل بدهی کیف پول' })
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutWalletDto) {
    return this.wallet.checkout(user.id, dto?.returnTo);
  }

  /**
   * Public return URL registered with the gateway. The transaction is verified
   * server-side and the browser lands back on the wallet panel.
   */
  @Public()
  @Get('payments/callback')
  @ApiOperation({ summary: 'بازگشت GET از درگاه پرداخت و تسویه بدهی کیف پول' })
  @ApiQuery({ name: 'paymentCode', required: false })
  @ApiQuery({ name: 'refId', required: false })
  @ApiQuery({ name: 'paymentRefId', required: false })
  @ApiQuery({ name: 'clientRefId', required: false })
  async callbackGet(
    @Query() query: Record<string, unknown>,
    @Query('returnTo') returnTo: string | undefined,
    @Res() res: Response,
  ) {
    return this.finishCallback(parseGatewayCallback(query, null), returnTo, res);
  }

  /** PayPing sends the result as a form-encoded POST (see gateway-callback.ts). */
  @Public()
  @Post('payments/callback')
  @ApiOperation({ summary: 'بازگشت POST از درگاه پرداخت و تسویه بدهی کیف پول' })
  @ApiBody({ schema: GATEWAY_CALLBACK_BODY_SCHEMA })
  async callbackPost(
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
    @Query('returnTo') returnTo: string | undefined,
    @Res() res: Response,
  ) {
    return this.finishCallback(parseGatewayCallback(query, body), returnTo, res);
  }

  private async finishCallback(
    payload: GatewayCallbackPayload,
    returnTo: string | undefined,
    res: Response,
  ) {
    const result = await this.wallet.handleCallback(payload);
    res.redirect(302, withReturnTo(result.redirectUrl, result.status, returnTo));
  }
}

/** Only same-site absolute paths are accepted as a post-payment destination. */
function withReturnTo(
  fallbackUrl: string,
  status: string,
  returnTo?: string,
): string {
  if (!returnTo || !/^\/(?!\/)/.test(returnTo)) return fallbackUrl;
  try {
    const target = new URL(fallbackUrl);
    const [path, search] = returnTo.split('?');
    target.pathname = path;
    const params = new URLSearchParams(search ?? '');
    params.set('payment', status);
    target.search = params.toString();
    return target.toString();
  } catch {
    return fallbackUrl;
  }
}

@ApiTags('wallet')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/wallets')
export class AdminWalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'فهرست کیف پول‌های دارای بدهی یا سررسید' })
  list() {
    return this.wallet.listAdmin();
  }

  @Get('lookup')
  @ApiOperation({
    summary: 'گردش کامل کیف پول یک شخص با کد ملی (گردش حساب، پرداخت‌ها، فاکتورها)',
  })
  @ApiQuery({ name: 'nationalCode', required: true, example: '0013529536' })
  lookup(@Query('nationalCode') nationalCode: string) {
    return this.wallet.historyByNationalCode(nationalCode ?? '');
  }

  @Post(':userId/adjust')
  @ApiOperation({ summary: 'تنظیم دستی کیف پول یک کاربر (بدهی/بستانکاری)' })
  adjust(
    @CurrentUser() admin: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: AdjustWalletDto,
  ) {
    return this.wallet.adjust(admin.id, userId, dto.amount, dto.title);
  }
}
