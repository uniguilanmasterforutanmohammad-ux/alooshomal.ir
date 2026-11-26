import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BusinessModuleGuard } from '../business-modules/business-module.guard';
import { RequireModule } from '../business-modules/require-module.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { DeclineOrderDto } from './dto/decline-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { RetailService } from './retail.service';

@ApiTags('retail')
@ApiBearerAuth()
@UseGuards(BusinessModuleGuard)
@RequireModule('retailOrders')
@Controller('retail/orders')
export class RetailOrdersController {
  constructor(private readonly retail: RetailService) {}

  @Get()
  @ApiOperation({ summary: 'فهرست سفارش‌های فروشگاه (فیلتر وضعیت)' })
  list(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    return this.retail.listOrders(user.id, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'جزئیات یک سفارش' })
  find(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.retail.findOrder(user.id, id);
  }

  @Get('by-token/:token')
  @ApiOperation({
    summary: 'جزئیات سفارش برای مالک از روی توکن پیگیری (صفحه‌ی پیگیری مشتری)',
  })
  findByToken(@CurrentUser() user: AuthUser, @Param('token') token: string) {
    return this.retail.findOrderByTokenForOwner(user.id, token);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تغییر وضعیت سفارش یا وضعیت پرداخت' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.retail.updateOrder(user.id, id, dto);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'تأیید سفارش در انتظار (اجازه‌ی پرداخت به مشتری)' })
  approve(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.retail.approveOrder(user.id, id);
  }

  @Post(':id/decline')
  @ApiOperation({ summary: 'رد سفارش در انتظار و بازگرداندن موجودی' })
  decline(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: DeclineOrderDto,
  ) {
    return this.retail.declineOrder(user.id, id, dto.reason);
  }
}
