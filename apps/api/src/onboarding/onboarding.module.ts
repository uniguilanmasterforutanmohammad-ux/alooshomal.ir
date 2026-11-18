import { Module } from '@nestjs/common';

import { ActivityModule } from '../activity/activity.module';
import { ApiIrModule } from '../apiir/apiir.module';
import { BusinessModulesModule } from '../business-modules/business-modules.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProfileModule } from '../profile/profile.module';
import { SettingsModule } from '../settings/settings.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ZohalModule } from '../zohal/zohal.module';
import {
  AdminOnboardingController,
  OnboardingController,
} from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [
    PrismaModule,
    SettingsModule,
    ActivityModule,
    ApiIrModule,
    BusinessModulesModule,
    ProfileModule,
    SubscriptionsModule,
    ZohalModule,
  ],
  controllers: [OnboardingController, AdminOnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
