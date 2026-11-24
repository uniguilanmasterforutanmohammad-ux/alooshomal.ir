import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { ActivityContextInterceptor } from './activity/activity-context.interceptor';
import { PermissionsGuard } from './auth/permissions.guard';
import { CommonModule } from './common/common.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { validateEnv } from './config/env.validation';

import { AdminModule } from './admin/admin.module';
import { ActivityModule } from './activity/activity.module';
import { AdsModule } from './ads/ads.module';
import { AccommodationsModule } from './accommodations/accommodations.module';
import { ApiIrModule } from './apiir/apiir.module';
import { AuthModule } from './auth/auth.module';
import { BackupModule } from './backup/backup.module';
import { BaleModule } from './bale/bale.module';
import { BiolinksModule } from './biolinks/biolinks.module';
import { BlogModule } from './blog/blog.module';
import { BoostsModule } from './boosts/boosts.module';
import { BusinessCardsModule } from './businesscards/business-cards.module';
import { BusinessModulesModule } from './business-modules/business-modules.module';
import { WorkspaceContextInterceptor } from './business-modules/workspace-context.interceptor';
import { CrmModule } from './crm/crm.module';
import { CardToCardModule } from './card-to-card/card-to-card.module';
import { BuildingsModule } from './buildings/buildings.module';
import { RealEstateModule } from './realestate/realestate.module';
import { RetailModule } from './retail/retail.module';
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
import { PaymentsModule } from './payments/payments.module';
import { InquiriesModule } from './inquiries/inquiries.module';
import { ProfileModule } from './profile/profile.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { RequestPaymentsModule } from './request-payments/request-payments.module';
import { SessionsModule } from './sessions/sessions.module';
import { SeoModule } from './seo/seo.module';
import { SettingsModule } from './settings/settings.module';
import { SocialAccountsModule } from './social-accounts/social-accounts.module';
import { SmsModule } from './sms/sms.module';
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
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate: validateEnv,
    }),
    PrismaModule,
    RedisModule,
    SessionsModule,
    CommonModule,
    SmsModule,
    BaleModule,
    ActivityModule,
    AuthModule,
    BackupModule,
    UsersModule,
    BiolinksModule,
    BusinessCardsModule,
    BusinessModulesModule,
    AccommodationsModule,
    RetailModule,
    BuildingsModule,
    RealEstateModule,
    CardToCardModule,
    CrmModule,
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
    PaymentsModule,
    InquiriesModule,
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
    ApiIrModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: ActivityContextInterceptor },
    { provide: APP_INTERCEPTOR, useClass: WorkspaceContextInterceptor },
  ],
})
export class AppModule {}
