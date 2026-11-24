import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../common/decorators/public.decorator';
import { BuildingsService } from './buildings.service';
import { ResidentPaymentDto } from './dto/buildings.dto';

@ApiTags('buildings')
@Controller('public/buildings')
export class PublicBuildingsController {
  constructor(private readonly buildings: BuildingsService) {}

  @Public()
  @Get('resident/:token')
  @ApiOperation({ summary: '(عمومی) پنل ساکن: شارژها و پرداخت‌های یک واحد با لینک اختصاصی' })
  panel(@Param('token') token: string) {
    return this.buildings.residentPanel(token);
  }

  @Public()
  @Post('resident/:token/payments')
  @ApiOperation({ summary: '(عمومی) ثبت رسید پرداخت توسط ساکن' })
  pay(@Param('token') token: string, @Body() dto: ResidentPaymentDto) {
    return this.buildings.createResidentPayment(token, dto);
  }
}
