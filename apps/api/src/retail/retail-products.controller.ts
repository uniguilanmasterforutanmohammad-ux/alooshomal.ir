import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { BusinessModuleGuard } from '../business-modules/business-module.guard';
import { RequireModule } from '../business-modules/require-module.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { MAX_FEED_UPLOAD_BYTES } from '../uploads/uploads.constants';
import { UploadsService } from '../uploads/uploads.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RetailService } from './retail.service';

@ApiTags('retail')
@ApiBearerAuth()
@UseGuards(BusinessModuleGuard)
@RequireModule('retailCatalog')
@Controller('retail/products')
export class RetailProductsController {
  constructor(
    private readonly retail: RetailService,
    private readonly uploads: UploadsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'فهرست محصولات فروشگاه (جستجو با q)' })
  list(@CurrentUser() user: AuthUser, @Query('q') q?: string) {
    return this.retail.listProducts(user.id, q);
  }

  @Get('meta')
  @ApiOperation({
    summary: 'دسته‌بندی‌های محصول و محدودیت تعداد/حجم تصاویر برای فرم ثبت',
  })
  meta() {
    return this.retail.productFormMeta();
  }

  @Post('uploads')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FEED_UPLOAD_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'آپلود تصویر محصول (WebP) با محدودیت حجم تعیین‌شده توسط مدیر',
  })
  async upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const { maxImageKb } = await this.retail.getImageSettings();
    return this.uploads.upload('gallery', user.id, file, maxImageKb * 1024);
  }

  @Post()
  @ApiOperation({
    summary:
      'ثبت محصول جدید (پیش‌نویس یا ارسال برای تأیید؛ انتشار فقط پس از تأیید مدیر)',
  })
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
