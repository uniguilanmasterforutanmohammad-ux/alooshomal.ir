import { Module } from '@nestjs/common';

import { PaypingController } from './payping.controller';
import { PaypingService } from './payping.service';

@Module({
  controllers: [PaypingController],
  providers: [PaypingService],
  exports: [PaypingService],
})
export class PaypingModule {}
