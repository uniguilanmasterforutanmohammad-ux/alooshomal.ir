import { Module } from '@nestjs/common';

import { BoostsModule } from '../boosts/boosts.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { UploadsModule } from '../uploads/uploads.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { BulkService } from './bulk.service';

@Module({
  imports: [
    SubscriptionsModule,
    BoostsModule,
    NotificationsModule,
    SettingsModule,
    UploadsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, BulkService],
})
export class AdminModule {}
