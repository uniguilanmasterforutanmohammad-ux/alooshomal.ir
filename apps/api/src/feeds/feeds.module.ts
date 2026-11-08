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
import { FeedsDirectoryService } from './feeds-directory.service';
import { FeedsService } from './feeds.service';
import { FeedCommentsService } from './feed-comments.service';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    ActivityModule,
    SettingsModule,
    UploadsModule,
  ],
  controllers: [FeedsPublicController, FeedsUserController, AdminFeedsController],
  providers: [FeedsService, FeedsDirectoryService, FeedCommentsService],
  exports: [FeedsService, FeedsDirectoryService],
})
export class FeedsModule {}
