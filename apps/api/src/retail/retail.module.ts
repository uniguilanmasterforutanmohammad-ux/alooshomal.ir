import { Module } from '@nestjs/common';

import { BusinessModulesModule } from '../business-modules/business-modules.module';
import { SettingsModule } from '../settings/settings.module';
import { PublicRetailController } from './public-retail.controller';
import { RetailInventoryController } from './retail-inventory.controller';
import { RetailOrdersController } from './retail-orders.controller';
import { RetailProductsController } from './retail-products.controller';
import { RetailService } from './retail.service';

@Module({
  imports: [BusinessModulesModule, SettingsModule],
  controllers: [
    RetailProductsController,
    RetailOrdersController,
    RetailInventoryController,
    PublicRetailController,
  ],
  providers: [RetailService],
  exports: [RetailService],
})
export class RetailModule {}
