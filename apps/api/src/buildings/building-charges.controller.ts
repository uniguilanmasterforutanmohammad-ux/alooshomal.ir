import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BusinessModuleGuard } from '../business-modules/business-module.guard';
import { RequireModule } from '../business-modules/require-module.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { BuildingsService } from './buildings.service';
import {
  BulkChargeDto,
  CreateChargeDto,
  CreatePaymentDto,
  ReviewPaymentDto,
  UpdateChargeDto,
} from './dto/buildings.dto';

@ApiTags('buildings')
@ApiBearerAuth()
@UseGuards(BusinessModuleGuard)
@RequireModule('buildingCharges')
@Controller('building-charges')
export class BuildingChargesController {
  constructor(private readonly buildings: BuildingsService) {}

  @Get()
  @ApiOperation({ summary: 'فهرست شارژها (فیلتر ساختمان و وضعیت)' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('buildingId') buildingId?: string,
    @Query('status') status?: string,
  ) {
    return this.buildings.listCharges(user.id, buildingId, status);
  }

  @Post()
  @ApiOperation({ summary: 'صدور شارژ برای یک واحد' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateChargeDto) {
    return this.buildings.createCharge(user.id, dto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'صدور گروهی شارژ برای همه‌ی واحدهای فعال (ثابت یا بر اساس متراژ)' })
  bulk(@CurrentUser() user: AuthUser, @Body() dto: BulkChargeDto) {
    return this.buildings.issueBulkCharge(user.id, dto);
  }

  @Get('summary/:buildingId')
  @ApiOperation({ summary: 'خلاصه‌ی مطالبات یک ساختمان' })
  summary(@CurrentUser() user: AuthUser, @Param('buildingId') buildingId: string) {
    return this.buildings.chargesSummary(user.id, buildingId);
  }

  @Get('reminders')
  @ApiOperation({ summary: 'شارژهای سررسیدشده یا نزدیک سررسید (۷ روز)' })
  reminders(
    @CurrentUser() user: AuthUser,
    @Query('buildingId') buildingId?: string,
  ) {
    return this.buildings.reminders(user.id, buildingId);
  }

  @Get('export')
  @ApiOperation({ summary: 'خروجی CSV شارژها (سازگار با اکسل)' })
  async export(
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
    @Query('buildingId') buildingId?: string,
  ) {
    const csv = await this.buildings.exportChargesCsv(user.id, buildingId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="building-charges.csv"');
    res.send(csv);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش شارژ' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateChargeDto,
  ) {
    return this.buildings.updateCharge(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف شارژ' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.buildings.removeCharge(user.id, id);
  }

  @Get('payments')
  @ApiOperation({ summary: 'فهرست پرداخت‌های ثبت‌شده (رسیدها)' })
  payments(
    @CurrentUser() user: AuthUser,
    @Query('buildingId') buildingId?: string,
    @Query('status') status?: string,
  ) {
    return this.buildings.listPayments(user.id, buildingId, status);
  }

  @Post('payments')
  @ApiOperation({ summary: 'ثبت پرداخت/رسید برای یک واحد' })
  createPayment(@CurrentUser() user: AuthUser, @Body() dto: CreatePaymentDto) {
    return this.buildings.createPayment(user.id, dto);
  }

  @Patch('payments/:id')
  @ApiOperation({ summary: 'تأیید یا رد پرداخت (رسید به‌تنهایی تسویه نیست)' })
  reviewPayment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReviewPaymentDto,
  ) {
    return this.buildings.reviewPayment(user.id, id, dto);
  }
}
