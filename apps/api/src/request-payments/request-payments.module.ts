import { Module } from '@nestjs/common';

import { FinanceModule } from '../finance/finance.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaypingModule } from '../payping/payping.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RequestPaymentsController } from './request-payments.controller';
import { RequestPaymentsService } from './request-payments.service';

@Module({
  imports: [PrismaModule, PaypingModule, NotificationsModule, FinanceModule],
  controllers: [RequestPaymentsController],
  providers: [RequestPaymentsService],
  exports: [RequestPaymentsService],
})
export class RequestPaymentsModule {}
