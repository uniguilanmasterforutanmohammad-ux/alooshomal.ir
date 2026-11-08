import { Module } from '@nestjs/common';

import { PaypingOAuthController } from './payping-oauth.controller';
import { PaypingOAuthService } from './payping-oauth.service';

@Module({
  controllers: [PaypingOAuthController],
  providers: [PaypingOAuthService],
  exports: [PaypingOAuthService],
})
export class PaypingOAuthModule {}
