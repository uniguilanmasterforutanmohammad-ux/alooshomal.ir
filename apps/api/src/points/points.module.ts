import { Module } from '@nestjs/common';

import { ActivityModule } from '../activity/activity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import {
  AdminPointsController,
  PointsController,
} from './points.controller';
import { PointsService } from './points.service';

@Module({
  imports: [PrismaModule, NotificationsModule, ActivityModule, SettingsModule],
  controllers: [PointsController, AdminPointsController],
  providers: [PointsService],
  exports: [PointsService],
})
export class PointsModule {}
