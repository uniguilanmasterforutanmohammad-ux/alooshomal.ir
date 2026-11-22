import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('mine')
  @ApiOperation({
    summary: 'همه‌ی پرداخت‌های من با جزئیات سفارش و وضعیت موفق/ناموفق',
  })
  mine(@CurrentUser() user: AuthUser) {
    return this.payments.mine(user.id);
  }
}
