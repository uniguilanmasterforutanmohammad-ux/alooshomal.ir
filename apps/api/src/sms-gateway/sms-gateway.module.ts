import { Module } from '@nestjs/common';

import { BusinessModulesModule } from '../business-modules/business-modules.module';
import { RetailModule } from '../retail/retail.module';
import { SettingsModule } from '../settings/settings.module';
import { SmsGatewayDeviceController } from './sms-gateway-device.controller';
import { SmsGatewayController } from './sms-gateway.controller';
import { SmsDeviceGuard } from './sms-device.guard';
import { SmsGatewayService } from './sms-gateway.service';

@Module({
  imports: [BusinessModulesModule, SettingsModule, RetailModule],
  controllers: [SmsGatewayController, SmsGatewayDeviceController],
  providers: [SmsGatewayService, SmsDeviceGuard],
})
export class SmsGatewayModule {}
