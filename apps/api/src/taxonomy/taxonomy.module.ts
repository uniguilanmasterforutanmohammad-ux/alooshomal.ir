import { Module } from '@nestjs/common';

import { TaxonomyService } from './taxonomy.service';
import {
  AdminBusinessesController,
  AdminCitiesController,
  BusinessesController,
  CitiesController,
} from './taxonomy.controller';

@Module({
  controllers: [
    CitiesController,
    BusinessesController,
    AdminCitiesController,
    AdminBusinessesController,
  ],
  providers: [TaxonomyService],
  exports: [TaxonomyService],
})
export class TaxonomyModule {}
