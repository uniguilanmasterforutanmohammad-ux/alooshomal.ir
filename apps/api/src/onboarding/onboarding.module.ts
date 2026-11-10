import { Module } from '@nestjs/common';

import { ActivityModule } from '../activity/activity.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import {
  AdminOnboardingController,
  OnboardingController,
} from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [PrismaModule, SettingsModule, ActivityModule],
  controllers: [OnboardingController, AdminOnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
