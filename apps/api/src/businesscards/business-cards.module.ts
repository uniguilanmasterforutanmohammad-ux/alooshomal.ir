import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { BusinessCardsController } from './business-cards.controller';
import { BusinessCardsService } from './business-cards.service';

@Module({
  imports: [SubscriptionsModule, SettingsModule, NotificationsModule],
  controllers: [BusinessCardsController],
  providers: [BusinessCardsService],
  exports: [BusinessCardsService],
})
export class BusinessCardsModule {}
