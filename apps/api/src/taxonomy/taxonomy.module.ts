import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { TaxonomyService } from './taxonomy.service';
import {
  AdminBusinessesController,
  AdminCitiesController,
  BusinessTaxonomyController,
  BusinessesController,
  CitiesController,
} from './taxonomy.controller';

@Module({
  imports: [NotificationsModule],
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
