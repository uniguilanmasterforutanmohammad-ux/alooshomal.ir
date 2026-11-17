import { Module } from '@nestjs/common';

import { SettingsModule } from '../settings/settings.module';
import { BusinessModuleGuard } from './business-module.guard';
import { BusinessModulesController } from './business-modules.controller';
import { BusinessModulesService } from './business-modules.service';

@Module({
  imports: [SettingsModule],
  controllers: [BusinessModulesController],
  providers: [BusinessModulesService, BusinessModuleGuard],
  exports: [BusinessModulesService, BusinessModuleGuard],
})
export class BusinessModulesModule {}
