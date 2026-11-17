import { Module } from '@nestjs/common';

import { ActivityModule } from '../activity/activity.module';
import { BusinessModulesModule } from '../business-modules/business-modules.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
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
    BusinessModulesModule,
    SubscriptionsModule,
  ],
  controllers: [OnboardingController, AdminOnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
