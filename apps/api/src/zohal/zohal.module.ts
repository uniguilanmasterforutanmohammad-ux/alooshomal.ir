import { Module } from '@nestjs/common';

import { ActivityModule } from '../activity/activity.module';
import { FinanceModule } from '../finance/finance.module';
import { PaypingModule } from '../payping/payping.module';
import { SettingsModule } from '../settings/settings.module';
import { WalletModule } from '../wallet/wallet.module';
import {
  AdminZohalController,
  ZohalProfileController,
  ZohalServicesController,
} from './zohal.controller';
import { ZohalPricingController } from './zohal-pricing.controller';
import { ZohalService } from './zohal.service';

@Module({
  imports: [
    ActivityModule,
    FinanceModule,
    PaypingModule,
    SettingsModule,
    WalletModule,
  ],
  controllers: [
    AdminZohalController,
    ZohalProfileController,
    ZohalServicesController,
    ZohalPricingController,
  ],
  providers: [ZohalService],
  exports: [ZohalService],
})
export class ZohalModule {}
