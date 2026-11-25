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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { Roles } from '../common/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  CreateRetailCategoryDto,
  UpdateRetailCategoryDto,
} from './dto/admin-category.dto';
import { ReviewRetailProductDto } from './dto/review-product.dto';
import { UpdateRetailImageSettingsDto } from './dto/retail-image-settings.dto';
import { RetailService } from './retail.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/retail')
export class AdminRetailController {
  constructor(private readonly retail: RetailService) {}

  @Get('categories')
  @ApiOperation({ summary: 'دسته‌بندی‌های محصولات فروشگاه‌ها' })
  categories() {
    return this.retail.listCategories(false);
  }

  @Post('categories')
  @ApiOperation({ summary: 'افزودن دسته‌بندی محصول (فقط مدیر)' })
  createCategory(@Body() dto: CreateRetailCategoryDto) {
    return this.retail.createCategory(dto);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'ویرایش دسته‌بندی محصول (فقط مدیر)' })
  updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateRetailCategoryDto,
  ) {
    return this.retail.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'حذف دسته‌بندی محصول (فقط مدیر)' })
  deleteCategory(@Param('id') id: string) {
    return this.retail.deleteCategory(id);
  }

  @Get('products')
  @ApiOperation({
    summary: 'فهرست محصولات فروشگاه‌ها برای صف بررسی و مدیریت',
  })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'take', required: false })
  products(
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('take') take?: string,
  ) {
    return this.retail.adminListProducts({
      status,
      q,
      take: take ? Number.parseInt(take, 10) : undefined,
    });
  }

  @Patch('products/:id/review')
  @ApiOperation({
    summary: 'تأیید/رد محصول ارسال‌شده توسط فروشگاه (فقط مدیر)',
  })
  review(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReviewRetailProductDto,
  ) {
    return this.retail.reviewProduct(user.id, id, dto);
  }

  @Get('settings')
  @ApiOperation({
    summary:
      'تنظیمات فروشگاه: تصاویر محصول، تعرفه‌ی ایمپورت و قابلیت‌های سراسری سفارش',
  })
  settings() {
    return this.retail.getImageSettings();
  }

  @Patch('settings')
  @ApiOperation({
    summary:
      'ذخیره تنظیمات فروشگاه: تصاویر، تعرفه‌ی ایمپورت و سوئیچ‌های سراسری سفارش',
  })
  updateSettings(@Body() dto: UpdateRetailImageSettingsDto) {
    return this.retail.updateImageSettings(dto);
  }
}
