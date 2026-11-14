import { Global, Module } from '@nestjs/common';

import { SmsService } from '../auth/sms.service';

/**
 * Melipayamak is used by auth (OTP), support chat and the admin notification
 * fan-out, so the client lives in a global module instead of being owned by
 * `AuthModule` (which would create a circular dependency with notifications).
 */
@Global()
@Module({
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
