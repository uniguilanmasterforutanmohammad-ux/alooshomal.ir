import { Module } from '@nestjs/common';

import { ActivityModule } from '../activity/activity.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { AdminProfileController, ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    ActivityModule,
    AuthModule,
    SettingsModule,
  ],
  controllers: [ProfileController, AdminProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
