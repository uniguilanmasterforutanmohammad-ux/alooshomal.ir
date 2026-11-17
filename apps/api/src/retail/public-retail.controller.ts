import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../common/decorators/public.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { RetailService } from './retail.service';

@ApiTags('retail')
@Public()
@Controller('public/shops')
export class PublicRetailController {
  constructor(private readonly retail: RetailService) {}

  @Get(':slug')
  @ApiOperation({
    summary: 'ویترین عمومی فروشگاه (محصولات منتشرشده + اطلاعات کارت به کارت)',
  })
  shop(@Param('slug') slug: string) {
    return this.retail.publicShop(slug);
  }

  @Post(':slug/orders')
  @ApiOperation({ summary: 'ثبت سفارش عمومی از ویترین فروشگاه' })
  order(@Param('slug') slug: string, @Body() dto: CreateOrderDto) {
    return this.retail.publicOrder(slug, dto);
  }
}
