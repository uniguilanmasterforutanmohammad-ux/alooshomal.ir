import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { ActivityContextInterceptor } from './activity/activity-context.interceptor';
import { PermissionsGuard } from './auth/permissions.guard';
import { CommonModule } from './common/common.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

import { AdminModule } from './admin/admin.module';
import { ActivityModule } from './activity/activity.module';
import { AuthModule } from './auth/auth.module';
import { BiolinksModule } from './biolinks/biolinks.module';
import { BoostsModule } from './boosts/boosts.module';
import { BusinessCardsModule } from './businesscards/business-cards.module';
import { HealthModule } from './health/health.module';
import { NotificationsModule } from './notifications/notifications.module';
import { NewsModule } from './news/news.module';
import { ProfileModule } from './profile/profile.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { SettingsModule } from './settings/settings.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { TaxonomyModule } from './taxonomy/taxonomy.module';
import { TicketsModule } from './tickets/tickets.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    PrismaModule,
    RedisModule,
    CommonModule,
    ActivityModule,
    AuthModule,
    UsersModule,
    BiolinksModule,
    BusinessCardsModule,
    SubscriptionsModule,
    BoostsModule,
    SettingsModule,
    NotificationsModule,
    NewsModule,
    ProfileModule,
    AdminModule,
    TaxonomyModule,
    TicketsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: ActivityContextInterceptor },
  ],
})
export class AppModule {}
