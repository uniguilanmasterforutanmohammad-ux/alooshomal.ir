import { Module } from '@nestjs/common';

import { ActivityModule } from '../activity/activity.module';
import { PaypingModule } from '../payping/payping.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { ZohalModule } from '../zohal/zohal.module';
import {
  AdminPricingController,
  PublicPricingController,
} from './pricing.controller';
import { PricingService } from './pricing.service';

@Module({
  imports: [
    ActivityModule,
    PaypingModule,
    PrismaModule,
    SettingsModule,
    ZohalModule,
  ],
  controllers: [PublicPricingController, AdminPricingController],
  providers: [PricingService],
})
export class PricingModule {}
