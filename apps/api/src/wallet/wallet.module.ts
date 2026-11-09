import { Module } from '@nestjs/common';

import { ActivityModule } from '../activity/activity.module';
import { FinanceModule } from '../finance/finance.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaypingModule } from '../payping/payping.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { AdminWalletController, WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [
    PrismaModule,
    SettingsModule,
    PaypingModule,
    NotificationsModule,
    ActivityModule,
    FinanceModule,
  ],
  controllers: [WalletController, AdminWalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
