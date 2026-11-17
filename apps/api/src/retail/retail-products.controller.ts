import {
  Body,
  Controller,
  Delete,
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
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RetailService } from './retail.service';

@ApiTags('retail')
@ApiBearerAuth()
@UseGuards(BusinessModuleGuard)
@RequireModule('retailCatalog')
@Controller('retail/products')
export class RetailProductsController {
  constructor(private readonly retail: RetailService) {}

  @Get()
  @ApiOperation({ summary: 'فهرست محصولات فروشگاه (جستجو با q)' })
  list(@CurrentUser() user: AuthUser, @Query('q') q?: string) {
    return this.retail.listProducts(user.id, q);
  }

  @Post()
  @ApiOperation({ summary: 'ثبت محصول جدید (پیش‌نویس یا منتشرشده)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProductDto) {
    return this.retail.createProduct(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش محصول' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.retail.updateProduct(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف محصول' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.retail.removeProduct(user.id, id);
  }
}
