import { Module } from '@nestjs/common';

import { ActivityModule } from '../activity/activity.module';
import { PaypingModule } from '../payping/payping.module';
import { SettingsModule } from '../settings/settings.module';
import { AdminApiIrController } from './apiir.controller';
import { ApiIrService } from './apiir.service';

@Module({
  imports: [ActivityModule, PaypingModule, SettingsModule],
  controllers: [AdminApiIrController],
  providers: [ApiIrService],
  exports: [ApiIrService],
})
export class ApiIrModule {}
