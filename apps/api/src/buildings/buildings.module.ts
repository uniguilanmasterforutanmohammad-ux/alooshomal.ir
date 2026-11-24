import { Module } from '@nestjs/common';

import { BusinessModulesModule } from '../business-modules/business-modules.module';
import { BuildingChargesController } from './building-charges.controller';
import { BuildingFinanceController } from './building-finance.controller';
import { BuildingMaintenanceController } from './building-maintenance.controller';
import { BuildingsController } from './buildings.controller';
import { BuildingsService } from './buildings.service';

@Module({
  imports: [BusinessModulesModule],
  controllers: [
    BuildingsController,
    BuildingChargesController,
    BuildingFinanceController,
    BuildingMaintenanceController,
  ],
  providers: [BuildingsService],
  exports: [BuildingsService],
})
export class BuildingsModule {}
