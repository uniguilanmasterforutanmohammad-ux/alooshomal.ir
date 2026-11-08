import { Module } from '@nestjs/common';

import { BiolinksModule } from '../biolinks/biolinks.module';
import { BusinessCardsModule } from '../businesscards/business-cards.module';
import { FeedsModule } from '../feeds/feeds.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RequestPaymentsModule } from '../request-payments/request-payments.module';
import { SettingsModule } from '../settings/settings.module';
import { BoostsController } from './boosts.controller';
import { BoostsService } from './boosts.service';

@Module({
  imports: [
    PrismaModule,
    BiolinksModule,
    BusinessCardsModule,
    FeedsModule,
    NotificationsModule,
    SettingsModule,
    RequestPaymentsModule,
  ],
  controllers: [BoostsController],
  providers: [BoostsService],
  exports: [BoostsService],
})
export class BoostsModule {}
