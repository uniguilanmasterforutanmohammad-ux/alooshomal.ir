import {
  Body,
  Controller,
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
import {
  DecideBlueTickDto,
  TestZohalServiceDto,
  UpdateZohalServiceDto,
} from './dto/zohal.dto';
import { ZohalService } from './zohal.service';

@ApiTags('zohal')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/zohal')
export class AdminZohalController {
  constructor(private readonly zohal: ZohalService) {}

  @Get('services')
  @ApiOperation({
    summary: 'فهرست همه‌ی سرویس‌های زحل + وضعیت فعال/غیرفعال',
  })
  list() {
    return this.zohal.listServices();
  }

  @Patch('services/:key')
  @ApiOperation({ summary: 'فعال/غیرفعال‌کردن و قیمت‌گذاری یک سرویس زحل' })
  update(
    @CurrentUser() admin: AuthUser,
    @Param('key') key: string,
    @Body() dto: UpdateZohalServiceDto,
  ) {
    return this.zohal.updateService(key, dto, admin.id);
  }

  @Post('services/:key/test')
  @ApiOperation({
    summary: 'فراخوانی آزمایشی یک سرویس زحل (هزینه‌زا — از کیف پول کسر می‌شود)',
  })
  test(@Param('key') key: string, @Body() dto: TestZohalServiceDto) {
    return this.zohal.call(key, dto.payload ?? {}, { force: true });
  }

  @Post('payping-products')
  @ApiOperation({
    summary:
      'ساخت/همگام‌سازی محصول پی‌پینگ همه‌ی خدمات فعال (دو استعلام هویتی به‌صورت یک محصول واحد)',
  })
  syncPaypingProducts() {
    return this.zohal.syncPaypingProducts();
  }

  @Get('blue-tick')
  @ApiOperation({ summary: 'درخواست‌های تیک آبی در انتظار بررسی' })
  blueTickRequests() {
    return this.zohal.listBlueTickRequests();
  }

  @Patch('blue-tick/:id')
  @ApiOperation({ summary: 'تأیید/رد درخواست تیک آبی یک کاربر' })
  decideBlueTick(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: DecideBlueTickDto,
  ) {
    return this.zohal.decideBlueTick(
      admin.id,
      id,
      dto.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
      dto.reason,
    );
  }
}

@ApiTags('profile')
@ApiBearerAuth()
@Controller('profile')
export class ZohalProfileController {
  constructor(private readonly zohal: ZohalService) {}

  @Get('identity-inquiry/status')
  @ApiOperation({ summary: 'آیا استعلام خودکار هویت (زحل) در دسترس است؟' })
  async identityStatus() {
    return { available: await this.zohal.identityInquiryAvailable() };
  }

  @Post('blue-tick/request')
  @ApiOperation({ summary: 'ثبت درخواست تیک آبی (پس از استعلام هویت)' })
  requestBlueTick(@CurrentUser() user: AuthUser) {
    return this.zohal.requestBlueTick(user.id);
  }
}
