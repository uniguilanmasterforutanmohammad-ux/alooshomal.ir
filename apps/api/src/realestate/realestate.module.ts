import { Module } from '@nestjs/common';

import { BusinessModulesModule } from '../business-modules/business-modules.module';
import { PropertyAuditsController } from './property-audits.controller';
import { PropertyContractsController } from './property-contracts.controller';
import { PropertyCooperationsController } from './property-cooperations.controller';
import { PropertyFilesController } from './property-files.controller';
import { PropertyLeadsController } from './property-leads.controller';
import { PropertyReportsController } from './property-reports.controller';
import { PropertyVisitsController } from './property-visits.controller';
import { PublicPropertiesController } from './public-properties.controller';
import { RealEstateService } from './realestate.service';

@Module({
  imports: [BusinessModulesModule],
  controllers: [
    PropertyFilesController,
    PropertyLeadsController,
    PropertyVisitsController,
    PropertyContractsController,
    PropertyReportsController,
    PropertyCooperationsController,
    PropertyAuditsController,
    PublicPropertiesController,
  ],
  providers: [RealEstateService],
  exports: [RealEstateService],
})
export class RealEstateModule {}
