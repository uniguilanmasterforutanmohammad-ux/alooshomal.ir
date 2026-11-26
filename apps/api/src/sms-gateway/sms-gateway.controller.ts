import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { IgnoreTransactionDto, LinkTransactionDto } from './dto/link-transaction.dto';
import { SmsGatewayService } from './sms-gateway.service';

@ApiTags('sms-gateway')
@ApiBearerAuth()
@Controller('sms-gateway')
export class SmsGatewayController {
  constructor(private readonly gateway: SmsGatewayService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'وضعیت دروازه‌ی پیامک: کارت، دستگاه‌ها و آخرین تراکنش‌ها',
  })
  overview(@CurrentUser() user: AuthUser) {
    return this.gateway.overview(user.id);
  }

  @Post('pairing-code')
  @ApiOperation({
    summary: 'ساخت کد اتصال یک‌بارمصرف برای اتصال اپ اندروید',
  })
  createPairingCode(@CurrentUser() user: AuthUser, @Req() request: Request) {
    return this.gateway.createPairingCode(user.id, request);
  }

  @Delete('devices/:id')
  @ApiOperation({ summary: 'قطع اتصال یک دستگاه پیامک' })
  revokeDevice(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.gateway.revokeDevice(user.id, id);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'صف پیامک‌های بانکی و وضعیت تطبیق' })
  transactions(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
  ) {
    return this.gateway.ownerTransactions(user.id, status);
  }

  @Post('transactions/:id/link')
  @ApiOperation({ summary: 'اتصال دستی یک پیامک واریز به سفارش و تأیید آن' })
  link(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: LinkTransactionDto,
  ) {
    return this.gateway.linkTransaction(user.id, id, dto);
  }

  @Get('transactions/:id/candidates')
  @ApiOperation({
    summary: 'سفارش‌های هم‌مبلغِ قابل اتصال به یک پیامک واریز',
  })
  candidates(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.gateway.transactionCandidates(user.id, id);
  }

  @Post('transactions/:id/rematch')
  @ApiOperation({ summary: 'تلاش دوباره برای تطبیق خودکار یک پیامک' })
  rematch(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.gateway.rematchTransaction(user.id, id);
  }

  @Post('transactions/:id/ignore')
  @ApiOperation({ summary: 'نادیده‌گرفتن یک پیامک واریز' })
  ignore(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: IgnoreTransactionDto,
  ) {
    return this.gateway.ignoreTransaction(user.id, id, dto);
  }
}
