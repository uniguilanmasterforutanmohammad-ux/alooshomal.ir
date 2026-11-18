import { Module } from '@nestjs/common';

import { ApiIrModule } from '../apiir/apiir.module';
import { FinanceModule } from '../finance/finance.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaypingModule } from '../payping/payping.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { WalletModule } from '../wallet/wallet.module';
import { ZohalModule } from '../zohal/zohal.module';
import { BusinessPackageService } from './business-package.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsExpiryJob } from './subscriptions-expiry.job';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsPaymentService } from './subscriptions-payment.service';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    PaypingModule,
    FinanceModule,
    SettingsModule,
    WalletModule,
    ZohalModule,
    ApiIrModule,
  ],
  controllers: [SubscriptionsController],
  providers: [
    BusinessPackageService,
    SubscriptionsService,
    SubscriptionsPaymentService,
    SubscriptionsExpiryJob,
  ],
  exports: [SubscriptionsService, SubscriptionsPaymentService],
})
export class SubscriptionsModule {}
