import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { BusinessCardsController } from './business-cards.controller';
import { BusinessCardsDirectoryService } from './business-cards-directory.service';
import { BusinessCardsService } from './business-cards.service';

@Module({
  imports: [SubscriptionsModule, SettingsModule, NotificationsModule],
  controllers: [BusinessCardsController],
  providers: [BusinessCardsService, BusinessCardsDirectoryService],
  exports: [BusinessCardsService],
})
export class BusinessCardsModule {}
