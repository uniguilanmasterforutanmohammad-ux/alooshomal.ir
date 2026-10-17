import { Module } from '@nestjs/common';

import { ActivityModule } from '../activity/activity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { UploadsModule } from '../uploads/uploads.module';
import {
  AdminFeedsController,
  FeedsPublicController,
  FeedsUserController,
} from './feeds.controller';
import { FeedsService } from './feeds.service';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    ActivityModule,
    SettingsModule,
    UploadsModule,
  ],
  controllers: [FeedsPublicController, FeedsUserController, AdminFeedsController],
  providers: [FeedsService],
  exports: [FeedsService],
})
export class FeedsModule {}
