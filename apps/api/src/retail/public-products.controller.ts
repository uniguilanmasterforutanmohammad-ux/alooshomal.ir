import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../common/decorators/public.decorator';
import { PublicProductListDto } from './dto/public-product-list.dto';
import { RetailService } from './retail.service';

@ApiTags('retail')
@Public()
@Controller('public/products')
export class PublicProductsController {
  constructor(private readonly retail: RetailService) {}

  @Get()
  @ApiOperation({
    summary:
      'دایرکتوری عمومی محصولات همه‌ی فروشگاه‌های فعال با فیلتر جست‌وجو، دسته، فروشگاه و بازه‌ی قیمت',
  })
  list(@Query() query: PublicProductListDto) {
    return this.retail.publicProducts(query);
  }

  @Get('facets')
  @ApiOperation({
    summary: 'گزینه‌های فیلتر دایرکتوری محصولات (دسته‌بندی‌ها و فروشگاه‌های دارای محصول)',
  })
  facets() {
    return this.retail.publicProductFacets();
  }
}
