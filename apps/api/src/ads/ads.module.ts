import { Module } from '@nestjs/common';

import { ActivityModule } from '../activity/activity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RequestPaymentsModule } from '../request-payments/request-payments.module';
import { SettingsModule } from '../settings/settings.module';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    ActivityModule,
    SettingsModule,
    RequestPaymentsModule,
  ],
  controllers: [AdsController],
  providers: [AdsService],
  exports: [AdsService],
})
export class AdsModule {}
