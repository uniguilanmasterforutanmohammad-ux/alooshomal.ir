import { Module } from '@nestjs/common';

import { BoostsModule } from '../boosts/boosts.module';
import { AdsModule } from '../ads/ads.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { UploadsModule } from '../uploads/uploads.module';
import { SessionsModule } from '../sessions/sessions.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { BulkService } from './bulk.service';

@Module({
  imports: [
    SubscriptionsModule,
    BoostsModule,
    AdsModule,
    NotificationsModule,
    SettingsModule,
    UploadsModule,
    SessionsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, BulkService],
})
export class AdminModule {}
