import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { BiolinksModule } from './biolinks/biolinks.module';
import { BoostsModule } from './boosts/boosts.module';
import { BusinessCardsModule } from './businesscards/business-cards.module';
import { HealthModule } from './health/health.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { SettingsModule } from './settings/settings.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { TaxonomyModule } from './taxonomy/taxonomy.module';
import { TicketsModule } from './tickets/tickets.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    PrismaModule,
    AuthModule,
    UsersModule,
    BiolinksModule,
    BusinessCardsModule,
    SubscriptionsModule,
    BoostsModule,
    SettingsModule,
    NotificationsModule,
    AdminModule,
    TaxonomyModule,
    TicketsModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
