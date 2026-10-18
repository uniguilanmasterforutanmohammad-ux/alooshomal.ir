import { Module } from '@nestjs/common';

import { AdminModule } from '../admin/admin.module';
import { FeedsModule } from '../feeds/feeds.module';
import { NewsModule } from '../news/news.module';
import { ModeratorController } from './moderator.controller';
import { ModeratorService } from './moderator.service';
import { ModeratorScopeGuard } from '../auth/moderator-scope.guard';

@Module({
  imports: [AdminModule, FeedsModule, NewsModule],
  controllers: [ModeratorController],
  providers: [ModeratorService, ModeratorScopeGuard],
})
export class ModeratorModule {}
