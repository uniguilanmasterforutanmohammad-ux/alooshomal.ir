import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ApiIrService } from './apiir.service';
import {
  CreateApiIrCompositeDto,
  TestApiIrServiceDto,
  UpdateApiIrCompositeDto,
  UpdateApiIrServiceDto,
} from './dto/apiir.dto';

@ApiTags('apiir')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/apiir')
export class AdminApiIrController {
  constructor(private readonly apiir: ApiIrService) {}

  @Get('services')
  @ApiOperation({
    summary: 'فهرست سرویس‌های api.ir + وضعیت فعال/غیرفعال و هزینه',
  })
  list() {
    return this.apiir.listServices();
  }

  @Patch('services/:key')
  @ApiOperation({ summary: 'فعال/غیرفعال‌کردن و قیمت‌گذاری یک سرویس api.ir' })
  update(
    @CurrentUser() admin: AuthUser,
    @Param('key') key: string,
    @Body() dto: UpdateApiIrServiceDto,
  ) {
    return this.apiir.updateService(key, dto, admin.id);
  }

  @Post('services/:key/test')
  @ApiOperation({
    summary: 'فراخوانی آزمایشی یک سرویس api.ir (هزینه‌زا — از اعتبار حساب api.ir کم می‌شود)',
  })
  test(@Param('key') key: string, @Body() dto: TestApiIrServiceDto) {
    return this.apiir.call(key, dto.payload ?? {}, { force: true });
  }

  @Post('services/:key/payping-product')
  @ApiOperation({
    summary:
      'ساخت/همگام‌سازی محصول پی‌پینگ برای یک سرویس api.ir با مبلغ ثبت‌شده‌ی آن',
  })
  syncPaypingProduct(
    @CurrentUser() admin: AuthUser,
    @Param('key') key: string,
  ) {
    return this.apiir.syncPaypingProduct(key, admin.id);
  }

  @Get('composites')
  @ApiOperation({ summary: 'فهرست محصولات ترکیبی ساخته‌شده از سرویس‌های api.ir' })
  listComposites() {
    return this.apiir.listComposites();
  }

  @Post('composites')
  @ApiOperation({ summary: 'ساخت یک محصول ترکیبی از چند سرویس api.ir' })
  createComposite(
    @CurrentUser() admin: AuthUser,
    @Body() dto: CreateApiIrCompositeDto,
  ) {
    return this.apiir.createComposite(dto, admin.id);
  }

  @Patch('composites/:key')
  @ApiOperation({ summary: 'ویرایش محصول ترکیبی api.ir' })
  updateComposite(
    @CurrentUser() admin: AuthUser,
    @Param('key') key: string,
    @Body() dto: UpdateApiIrCompositeDto,
  ) {
    return this.apiir.updateComposite(key, dto, admin.id);
  }

  @Delete('composites/:key')
  @ApiOperation({ summary: 'حذف محصول ترکیبی api.ir' })
  deleteComposite(
    @CurrentUser() admin: AuthUser,
    @Param('key') key: string,
  ) {
    return this.apiir.deleteComposite(key, admin.id);
  }

  @Post('composites/:key/payping-product')
  @ApiOperation({
    summary: 'ساخت/همگام‌سازی محصول پی‌پینگ یک محصول ترکیبی api.ir',
  })
  syncCompositeProduct(
    @CurrentUser() admin: AuthUser,
    @Param('key') key: string,
  ) {
    return this.apiir
      .syncCompositeProduct(key, admin.id)
      .then((code) => ({ key, code }));
  }
}
