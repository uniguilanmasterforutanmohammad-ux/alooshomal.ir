import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { WalletModule } from '../wallet/wallet.module';
import { BusinessCardsController } from './business-cards.controller';
import { BusinessCardsDirectoryService } from './business-cards-directory.service';
import { BusinessCardsEngagementService } from './business-cards-engagement.service';
import { BusinessCardsService } from './business-cards.service';
import { BusinessCategoriesController } from './business-categories.controller';
import { BusinessReviewsController } from './business-reviews.controller';
import { BusinessReviewsService } from './business-reviews.service';

@Module({
  imports: [SubscriptionsModule, SettingsModule, NotificationsModule, WalletModule],
  controllers: [
    BusinessCardsController,
    BusinessCategoriesController,
    BusinessReviewsController,
  ],
  providers: [
    BusinessCardsService,
    BusinessCardsDirectoryService,
    BusinessCardsEngagementService,
    BusinessReviewsService,
  ],
  exports: [BusinessCardsService, BusinessCardsEngagementService],
})
export class BusinessCardsModule {}
