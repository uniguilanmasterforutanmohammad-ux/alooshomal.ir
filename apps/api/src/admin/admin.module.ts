import { Module } from '@nestjs/common';

import { BoostsModule } from '../boosts/boosts.module';
import { AdsModule } from '../ads/ads.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { UploadsModule } from '../uploads/uploads.module';
import { SessionsModule } from '../sessions/sessions.module';
import { BusinessCardsModule } from '../businesscards/business-cards.module';
import { AdminController } from './admin.controller';
import { AdminRevenueService } from './admin-revenue.service';
import { AdminService } from './admin.service';
import { AdminUsersService } from './admin-users.service';
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
    BusinessCardsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminRevenueService, AdminUsersService, BulkService],
  exports: [AdminService, AdminUsersService],
})
export class AdminModule {}
