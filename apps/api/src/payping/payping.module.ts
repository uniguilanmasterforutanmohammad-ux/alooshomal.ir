import { Module } from '@nestjs/common';

import { PaymentSimulatorService } from './payment-simulator.service';
import { PaypingController } from './payping.controller';
import { PaypingService } from './payping.service';

@Module({
  controllers: [PaypingController],
  providers: [PaypingService, PaymentSimulatorService],
  exports: [PaypingService, PaymentSimulatorService],
})
export class PaypingModule {}
