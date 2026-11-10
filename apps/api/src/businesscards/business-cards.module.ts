import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { WalletModule } from '../wallet/wallet.module';
import { BusinessCardsController } from './business-cards.controller';
import { BusinessCardsDirectoryService } from './business-cards-directory.service';
import { BusinessCardsEngagementService } from './business-cards-engagement.service';
import { BusinessCardsService } from './business-cards.service';

@Module({
  imports: [SubscriptionsModule, SettingsModule, NotificationsModule, WalletModule],
  controllers: [BusinessCardsController],
  providers: [
    BusinessCardsService,
    BusinessCardsDirectoryService,
    BusinessCardsEngagementService,
  ],
  exports: [BusinessCardsService, BusinessCardsEngagementService],
})
export class BusinessCardsModule {}
