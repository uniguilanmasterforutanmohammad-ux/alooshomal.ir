import { Module } from '@nestjs/common';

import { ActivityModule } from '../activity/activity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import {
  AdminNewsController,
  NewsPublicController,
  ReporterController,
} from './news.controller';
import { NewsService } from './news.service';

@Module({
  imports: [PrismaModule, NotificationsModule, SettingsModule, ActivityModule],
  controllers: [NewsPublicController, ReporterController, AdminNewsController],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}
