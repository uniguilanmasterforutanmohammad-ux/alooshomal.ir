import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { OptionalAuth } from '../common/decorators/optional-auth.decorator';
import { Public } from '../common/decorators/public.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { RetailService } from './retail.service';

@ApiTags('retail')
@Controller('public/shops')
export class PublicRetailController {
  constructor(private readonly retail: RetailService) {}

  @Public()
  @Get(':slug')
  @ApiOperation({
    summary: 'ویترین عمومی فروشگاه (محصولات منتشرشده + اطلاعات کارت به کارت)',
  })
  shop(@Param('slug') slug: string) {
    return this.retail.publicShop(slug);
  }

  @Public()
  @Get(':slug/products/:product')
  @ApiOperation({
    summary: 'صفحه‌ی عمومی یک محصول منتشرشده همراه با محصولات مرتبط',
  })
  product(@Param('slug') slug: string, @Param('product') product: string) {
    return this.retail.publicProduct(slug, product);
  }

  @OptionalAuth()
  @Post(':slug/orders')
  @ApiOperation({ summary: 'ثبت سفارش عمومی از ویترین فروشگاه' })
  order(
    @Param('slug') slug: string,
    @Body() dto: CreateOrderDto,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.retail.publicOrder(slug, dto, user?.id);
  }

  @Public()
  @Get(':slug/orders/:token')
  @ApiOperation({
    summary: 'پیگیری عمومی سفارش با لینک اختصاصی (توکن) و خط زمانی وضعیت',
  })
  track(@Param('slug') slug: string, @Param('token') token: string) {
    return this.retail.publicOrderTracking(slug, token);
  }
}
