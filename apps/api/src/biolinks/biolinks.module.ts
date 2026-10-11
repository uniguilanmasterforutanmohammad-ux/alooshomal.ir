import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { BiolinksController } from './biolinks.controller';
import { BiolinksService } from './biolinks.service';

@Module({
  imports: [SubscriptionsModule, SettingsModule, NotificationsModule],
  controllers: [BiolinksController],
  providers: [BiolinksService],
  exports: [BiolinksService],
})
export class BiolinksModule {}
