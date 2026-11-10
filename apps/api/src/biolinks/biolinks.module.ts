import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { WalletModule } from '../wallet/wallet.module';
import { BiolinksController } from './biolinks.controller';
import { BiolinksDirectoryService } from './biolinks-directory.service';
import { BiolinksEngagementService } from './biolinks-engagement.service';
import { BiolinksService } from './biolinks.service';

@Module({
  imports: [SubscriptionsModule, SettingsModule, NotificationsModule, WalletModule],
  controllers: [BiolinksController],
  providers: [BiolinksService, BiolinksDirectoryService, BiolinksEngagementService],
  exports: [BiolinksService, BiolinksEngagementService],
})
export class BiolinksModule {}
