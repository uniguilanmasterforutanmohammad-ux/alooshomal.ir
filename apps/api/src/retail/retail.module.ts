import { Module } from '@nestjs/common';

import { BusinessModulesModule } from '../business-modules/business-modules.module';
import { FinanceModule } from '../finance/finance.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { UploadsModule } from '../uploads/uploads.module';
import { WalletModule } from '../wallet/wallet.module';
import { AdminRetailController } from './admin-retail.controller';
import { PublicProductsController } from './public-products.controller';
import { PublicRetailController } from './public-retail.controller';
import { RetailAiImportService } from './retail-ai-import.service';
import { RetailCustomerController } from './retail-customer.controller';
import { RetailInventoryController } from './retail-inventory.controller';
import { RetailOrdersController } from './retail-orders.controller';
import { RetailProductsController } from './retail-products.controller';
import { RetailReportsController } from './retail-reports.controller';
import { RetailShopSettingsController } from './retail-shop-settings.controller';
import { RetailService } from './retail.service';

@Module({
  imports: [
    BusinessModulesModule,
    SettingsModule,
    FinanceModule,
    NotificationsModule,
    UploadsModule,
    WalletModule,
  ],
  controllers: [
    AdminRetailController,
    RetailProductsController,
    RetailOrdersController,
    RetailCustomerController,
    RetailInventoryController,
    RetailShopSettingsController,
    RetailReportsController,
    PublicRetailController,
    PublicProductsController,
  ],
  providers: [RetailService, RetailAiImportService],
  exports: [RetailService],
})
export class RetailModule {}
