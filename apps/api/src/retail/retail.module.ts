import { Module } from '@nestjs/common';

import { BusinessModulesModule } from '../business-modules/business-modules.module';
import { FinanceModule } from '../finance/finance.module';
import { SettingsModule } from '../settings/settings.module';
import { PublicProductsController } from './public-products.controller';
import { PublicRetailController } from './public-retail.controller';
import { RetailInventoryController } from './retail-inventory.controller';
import { RetailOrdersController } from './retail-orders.controller';
import { RetailProductsController } from './retail-products.controller';
import { RetailReportsController } from './retail-reports.controller';
import { RetailShopSettingsController } from './retail-shop-settings.controller';
import { RetailService } from './retail.service';

@Module({
  imports: [BusinessModulesModule, SettingsModule, FinanceModule],
  controllers: [
    RetailProductsController,
    RetailOrdersController,
    RetailInventoryController,
    RetailShopSettingsController,
    RetailReportsController,
    PublicRetailController,
    PublicProductsController,
  ],
  providers: [RetailService],
  exports: [RetailService],
})
export class RetailModule {}
