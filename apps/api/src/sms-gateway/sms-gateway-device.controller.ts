import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { Public } from '../common/decorators/public.decorator';
import { CurrentSmsDevice } from './current-sms-device.decorator';
import { PairDeviceDto } from './dto/pair-device.dto';
import { ReportSmsTransactionDto } from './dto/report-transaction.dto';
import { SmsDeviceHeartbeatDto } from './dto/heartbeat.dto';
import {
  SmsDeviceContext,
  SmsDeviceGuard,
  SmsDeviceRequest,
} from './sms-device.guard';
import { SmsGatewayService } from './sms-gateway.service';

@ApiTags('sms-gateway-device')
@Controller('sms-gateway/device')
export class SmsGatewayDeviceController {
  constructor(private readonly gateway: SmsGatewayService) {}

  @Public()
  @Post('pair')
  @ApiOperation({ summary: 'اتصال اپ اندروید با کد یک‌بارمصرف' })
  pair(@Body() dto: PairDeviceDto, @Req() request: Request) {
    const ip = request.ip ?? request.socket.remoteAddress ?? '';
    return this.gateway.pairDevice(dto, ip);
  }

  @Public()
  @UseGuards(SmsDeviceGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'اطلاعات کسب‌وکار و کارت برای دستگاه متصل' })
  me(@CurrentSmsDevice() device: SmsDeviceContext) {
    return this.gateway.deviceInfo(device);
  }

  @Public()
  @UseGuards(SmsDeviceGuard)
  @ApiBearerAuth()
  @Get('transactions')
  @ApiOperation({ summary: 'آخرین پیامک‌های ارسال‌شده از این دستگاه' })
  transactions(
    @CurrentSmsDevice() device: SmsDeviceContext,
    @Query('limit') limit?: string,
  ) {
    const parsed = Number(limit);
    return this.gateway.deviceTransactions(
      device,
      Number.isFinite(parsed) ? parsed : 20,
    );
  }

  @Public()
  @UseGuards(SmsDeviceGuard)
  @ApiBearerAuth()
  @Post('transactions')
  @ApiOperation({ summary: 'ثبت یک واریز پیامکی و تلاش برای تطبیق خودکار' })
  report(
    @CurrentSmsDevice() device: SmsDeviceContext,
    @Body() dto: ReportSmsTransactionDto,
  ) {
    return this.gateway.reportTransaction(device, dto);
  }

  @Public()
  @UseGuards(SmsDeviceGuard)
  @ApiBearerAuth()
  @Post('heartbeat')
  @ApiOperation({ summary: 'اعلام زنده‌بودن دستگاه و نسخه‌ی اپ' })
  heartbeat(
    @CurrentSmsDevice() device: SmsDeviceContext,
    @Body() dto: SmsDeviceHeartbeatDto,
  ) {
    return this.gateway.heartbeat(device, dto);
  }
}
