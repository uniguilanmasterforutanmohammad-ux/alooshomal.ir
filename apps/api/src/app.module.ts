import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { ActivityContextInterceptor } from './activity/activity-context.interceptor';
import { PermissionsGuard } from './auth/permissions.guard';
import { CommonModule } from './common/common.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

import { AdminModule } from './admin/admin.module';
import { ActivityModule } from './activity/activity.module';
import { AdsModule } from './ads/ads.module';
import { AuthModule } from './auth/auth.module';
import { BiolinksModule } from './biolinks/biolinks.module';
import { BlogModule } from './blog/blog.module';
import { BoostsModule } from './boosts/boosts.module';
import { BusinessCardsModule } from './businesscards/business-cards.module';
import { FeedsModule } from './feeds/feeds.module';
import { FinanceModule } from './finance/finance.module';
import { HealthModule } from './health/health.module';
import { NotificationsModule } from './notifications/notifications.module';
import { NewsModule } from './news/news.module';
import { ModeratorModule } from './moderator/moderator.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { PaypingModule } from './payping/payping.module';
import { PaypingOAuthModule } from './payping-oauth/payping-oauth.module';
import { PointsModule } from './points/points.module';
import { PricingModule } from './pricing/pricing.module';
import { ProfileModule } from './profile/profile.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { RequestPaymentsModule } from './request-payments/request-payments.module';
import { SessionsModule } from './sessions/sessions.module';
import { SeoModule } from './seo/seo.module';
import { SettingsModule } from './settings/settings.module';
import { SocialAccountsModule } from './social-accounts/social-accounts.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { SupportChatModule } from './support-chat/support-chat.module';
import { TaxonomyModule } from './taxonomy/taxonomy.module';
import { TicketsModule } from './tickets/tickets.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';
import { ZohalModule } from './zohal/zohal.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    PrismaModule,
    RedisModule,
    SessionsModule,
    CommonModule,
    ActivityModule,
    AuthModule,
    UsersModule,
    BiolinksModule,
    BusinessCardsModule,
    FeedsModule,
    FinanceModule,
    BlogModule,
    SubscriptionsModule,
    BoostsModule,
    AdsModule,
    RequestPaymentsModule,
    SettingsModule,
    SocialAccountsModule,
    NotificationsModule,
    NewsModule,
    PointsModule,
    PricingModule,
    ProfileModule,
    ModeratorModule,
    MonitoringModule,
    OnboardingModule,
    PaypingModule,
    PaypingOAuthModule,
    AdminModule,
    TaxonomyModule,
    TicketsModule,
    SupportChatModule,
    UploadsModule,
    SeoModule,
    HealthModule,
    WalletModule,
    ZohalModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: ActivityContextInterceptor },
  ],
})
export class AppModule {}
