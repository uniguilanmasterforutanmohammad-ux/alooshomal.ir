import { Global, Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { AdminActivityController } from './activity.controller';
import { ActivityRetentionJob } from './activity-retention.job';
import { ActivityService } from './activity.service';

@Global()
@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [AdminActivityController],
  providers: [ActivityService, ActivityRetentionJob],
  exports: [ActivityService],
})
export class ActivityModule {}
