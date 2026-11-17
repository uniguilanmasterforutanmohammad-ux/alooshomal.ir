import { Module } from '@nestjs/common';

import { ActivityModule } from '../activity/activity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaypingModule } from '../payping/payping.module';
import { SettingsModule } from '../settings/settings.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { WalletModule } from '../wallet/wallet.module';
import { AdminBusinessModulesController } from './admin-business-modules.controller';
import { BusinessModuleGuard } from './business-module.guard';
import { BusinessModulesController } from './business-modules.controller';
import { BusinessModulesService } from './business-modules.service';

@Module({
  imports: [
    SettingsModule,
    SubscriptionsModule,
    WalletModule,
    PaypingModule,
    NotificationsModule,
    ActivityModule,
  ],
  controllers: [BusinessModulesController, AdminBusinessModulesController],
  providers: [BusinessModulesService, BusinessModuleGuard],
  exports: [BusinessModulesService, BusinessModuleGuard],
})
export class BusinessModulesModule {}
