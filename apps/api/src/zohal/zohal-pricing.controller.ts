import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../common/decorators/public.decorator';
import { ZohalService } from './zohal.service';

@ApiTags('zohal')
@Controller('zohal')
export class ZohalPricingController {
  constructor(private readonly zohal: ZohalService) {}

  /**
   * Public tariff of the inquiry services. Only services that the admin has
   * switched on **and** priced above zero are returned, so turning a service
   * off removes its row from the public «تعرفه‌ها» page automatically.
   */
  @Public()
  @Get('pricing')
  @ApiOperation({ summary: 'تعرفه‌ی عمومی سرویس‌های استعلام فعال' })
  pricing() {
    return this.zohal.publicPricing();
  }
}
