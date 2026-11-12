import { Module } from '@nestjs/common';

import { TaxonomyService } from './taxonomy.service';
import {
  AdminBusinessesController,
  AdminCitiesController,
  BusinessTaxonomyController,
  BusinessesController,
  CitiesController,
} from './taxonomy.controller';

@Module({
  controllers: [
    CitiesController,
    BusinessesController,
    BusinessTaxonomyController,
    AdminCitiesController,
    AdminBusinessesController,
  ],
  providers: [TaxonomyService],
  exports: [TaxonomyService],
})
export class TaxonomyModule {}
