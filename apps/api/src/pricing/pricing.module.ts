import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { ZohalModule } from '../zohal/zohal.module';
import { AdminPricingController } from './pricing.controller';
import { PricingService } from './pricing.service';

@Module({
  imports: [PrismaModule, SettingsModule, ZohalModule],
  controllers: [AdminPricingController],
  providers: [PricingService],
})
export class PricingModule {}
