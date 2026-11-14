import { Global, Module } from '@nestjs/common';

import { BaleService } from './bale.service';

/** Bale messenger delivery is shared by every OTP flow. */
@Global()
@Module({
  providers: [BaleService],
  exports: [BaleService],
})
export class BaleModule {}
