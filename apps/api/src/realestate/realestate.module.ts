import { Module } from '@nestjs/common';

import { BusinessModulesModule } from '../business-modules/business-modules.module';
import { PropertyContractsController } from './property-contracts.controller';
import { PropertyFilesController } from './property-files.controller';
import { PropertyLeadsController } from './property-leads.controller';
import { PropertyReportsController } from './property-reports.controller';
import { PropertyVisitsController } from './property-visits.controller';
import { RealEstateService } from './realestate.service';

@Module({
  imports: [BusinessModulesModule],
  controllers: [
    PropertyFilesController,
    PropertyLeadsController,
    PropertyVisitsController,
    PropertyContractsController,
    PropertyReportsController,
  ],
  providers: [RealEstateService],
  exports: [RealEstateService],
})
export class RealEstateModule {}
