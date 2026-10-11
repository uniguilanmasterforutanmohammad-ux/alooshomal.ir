import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import {
  AdminNotificationsController,
  NotificationsController,
} from './notifications.controller';
import { NotificationsEventsService } from './notifications-events.service';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [NotificationsService, NotificationsEventsService],
  exports: [NotificationsService, NotificationsEventsService],
})
export class NotificationsModule {}
