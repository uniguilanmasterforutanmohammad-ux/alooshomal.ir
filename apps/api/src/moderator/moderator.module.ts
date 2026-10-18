import { Module } from '@nestjs/common';

import { AdminModule } from '../admin/admin.module';
import { AdsModule } from '../ads/ads.module';
import { BoostsModule } from '../boosts/boosts.module';
import { FeedsModule } from '../feeds/feeds.module';
import { NewsModule } from '../news/news.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ModeratorController } from './moderator.controller';
import { ContentDecisionService } from './content-decision.service';
import { ModeratorService } from './moderator.service';
import { ModeratorScopeGuard } from '../auth/moderator-scope.guard';

@Module({
  imports: [
    AdminModule,
    FeedsModule,
    NewsModule,
    SubscriptionsModule,
    BoostsModule,
    AdsModule,
  ],
  controllers: [ModeratorController],
  providers: [ModeratorService, ContentDecisionService, ModeratorScopeGuard],
})
export class ModeratorModule {}
