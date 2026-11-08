import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { PaypingModule } from '../payping/payping.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RequestPaymentsController } from './request-payments.controller';
import { RequestPaymentsService } from './request-payments.service';

@Module({
  imports: [PrismaModule, PaypingModule, NotificationsModule],
  controllers: [RequestPaymentsController],
  providers: [RequestPaymentsService],
  exports: [RequestPaymentsService],
})
export class RequestPaymentsModule {}
