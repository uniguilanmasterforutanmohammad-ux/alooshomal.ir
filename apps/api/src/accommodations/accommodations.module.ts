import { Module } from '@nestjs/common';

import { BusinessModulesModule } from '../business-modules/business-modules.module';
import { SettingsModule } from '../settings/settings.module';
import { AccommodationChannelsController } from './accommodation-channels.controller';
import { AccommodationChannelsService } from './accommodation-channels.service';
import { AccommodationsController } from './accommodations.controller';
import { AccommodationsService } from './accommodations.service';
import { PublicAccommodationsController } from './public-accommodations.controller';

@Module({
  imports: [BusinessModulesModule, SettingsModule],
  controllers: [
    AccommodationsController,
    PublicAccommodationsController,
    AccommodationChannelsController,
  ],
  providers: [AccommodationsService, AccommodationChannelsService],
  exports: [AccommodationsService, AccommodationChannelsService],
})
export class AccommodationsModule {}
