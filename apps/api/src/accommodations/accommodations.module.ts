import { Module } from '@nestjs/common';

import { BusinessModulesModule } from '../business-modules/business-modules.module';
import { FinanceModule } from '../finance/finance.module';
import { PaypingModule } from '../payping/payping.module';
import { SettingsModule } from '../settings/settings.module';
import { UploadsModule } from '../uploads/uploads.module';
import { WalletModule } from '../wallet/wallet.module';
import { AccommodationAiImportService } from './accommodation-ai-import.service';
import { AccommodationChannelsController } from './accommodation-channels.controller';
import { AccommodationChannelsService } from './accommodation-channels.service';
import { AdminAccommodationsController } from './admin-accommodations.controller';
import { AccommodationsController } from './accommodations.controller';
import { AccommodationsService } from './accommodations.service';
import { PublicAccommodationsController } from './public-accommodations.controller';

@Module({
  imports: [
    BusinessModulesModule,
    SettingsModule,
    PaypingModule,
    FinanceModule,
    UploadsModule,
    WalletModule,
  ],
  controllers: [
    AccommodationsController,
    PublicAccommodationsController,
    AccommodationChannelsController,
    AdminAccommodationsController,
  ],
  providers: [
    AccommodationsService,
    AccommodationChannelsService,
    AccommodationAiImportService,
  ],
  exports: [AccommodationsService, AccommodationChannelsService],
})
export class AccommodationsModule {}
