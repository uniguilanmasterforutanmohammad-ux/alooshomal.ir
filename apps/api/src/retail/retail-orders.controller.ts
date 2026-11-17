import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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

  @Patch(':id')
  @ApiOperation({ summary: 'تغییر وضعیت سفارش یا وضعیت پرداخت' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.retail.updateOrder(user.id, id, dto);
  }
}
