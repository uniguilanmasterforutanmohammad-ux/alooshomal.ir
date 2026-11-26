import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { RetailService } from './retail.service';

/**
 * Customer-facing order history. This is intentionally NOT gated by the
 * `retailOrders` business module: an end customer has no business workspace but
 * still needs to see the purchases they made from shops.
 */
@ApiTags('retail')
@ApiBearerAuth()
@Controller('retail/my-orders')
export class RetailCustomerController {
  constructor(private readonly retail: RetailService) {}

  @Get()
  @ApiOperation({
    summary: 'سوابق خرید کاربر از فروشگاه‌ها (سفارش‌های ثبت‌شده به نام خودش)',
  })
  list(@CurrentUser() user: AuthUser) {
    return this.retail.listMyOrders(user.id);
  }
}
