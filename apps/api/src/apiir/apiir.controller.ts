import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ApiIrService } from './apiir.service';
import {
  TestApiIrServiceDto,
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
}
