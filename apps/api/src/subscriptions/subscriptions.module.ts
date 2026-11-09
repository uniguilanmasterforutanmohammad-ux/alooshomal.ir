import { Module } from '@nestjs/common';

import { FinanceModule } from '../finance/finance.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaypingModule } from '../payping/payping.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { WalletModule } from '../wallet/wallet.module';
import { SubscriptionsController } from './subscriptions.controller';
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
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionsPaymentService],
  exports: [SubscriptionsService, SubscriptionsPaymentService],
})
export class SubscriptionsModule {}
