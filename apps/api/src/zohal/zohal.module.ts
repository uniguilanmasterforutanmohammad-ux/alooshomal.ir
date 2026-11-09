import { Module } from '@nestjs/common';

import { ActivityModule } from '../activity/activity.module';
import { SettingsModule } from '../settings/settings.module';
import {
  AdminZohalController,
  ZohalProfileController,
} from './zohal.controller';
import { ZohalService } from './zohal.service';

@Module({
  imports: [ActivityModule, SettingsModule],
  controllers: [AdminZohalController, ZohalProfileController],
  providers: [ZohalService],
  exports: [ZohalService],
})
export class ZohalModule {}
