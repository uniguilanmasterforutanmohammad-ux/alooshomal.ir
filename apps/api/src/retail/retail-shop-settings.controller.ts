import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BusinessModuleGuard } from '../business-modules/business-module.guard';
import { RequireModule } from '../business-modules/require-module.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { UpsertShopSettingsDto } from './dto/shop-settings.dto';
import { RetailService } from './retail.service';

@ApiTags('retail')
@ApiBearerAuth()
@UseGuards(BusinessModuleGuard)
@RequireModule('retailCatalog')
@Controller('retail/shop-settings')
export class RetailShopSettingsController {
  constructor(private readonly retail: RetailService) {}

  @Get()
  @ApiOperation({
    summary: 'تنظیمات فروشگاه: محدوده‌ی فروش، کرایه‌ی ارسال، دریافت حضوری و پشتیبانی',
  })
  get(@CurrentUser() user: AuthUser) {
    return this.retail.getShopSettings(user.id);
  }

  @Put()
  @ApiOperation({ summary: 'ذخیره‌ی تنظیمات فروشگاه' })
  update(@CurrentUser() user: AuthUser, @Body() dto: UpsertShopSettingsDto) {
    return this.retail.updateShopSettings(user.id, dto);
  }
}
