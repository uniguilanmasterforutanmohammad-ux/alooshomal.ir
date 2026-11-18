import { Module } from '@nestjs/common';

import { BusinessPackageService } from './business-package.service';

/**
 * Pricing/activation of «مدیریت کسب‌وکار» packages, importable by both the
 * business panel and the subscriptions checkout without a circular dependency.
 */
@Module({
  providers: [BusinessPackageService],
  exports: [BusinessPackageService],
})
export class BusinessPackageModule {}
