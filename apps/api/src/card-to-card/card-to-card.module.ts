import { Module } from '@nestjs/common';

import { BusinessModulesModule } from '../business-modules/business-modules.module';
import { RetailModule } from '../retail/retail.module';
import { SettingsModule } from '../settings/settings.module';
import { CardToCardController } from './card-to-card.controller';
import { CardToCardService } from './card-to-card.service';
import { PublicCardToCardController } from './public-card-to-card.controller';

@Module({
  imports: [BusinessModulesModule, SettingsModule, RetailModule],
  controllers: [CardToCardController, PublicCardToCardController],
  providers: [CardToCardService],
  exports: [CardToCardService],
})
export class CardToCardModule {}
