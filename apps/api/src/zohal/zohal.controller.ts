import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  GATEWAY_CALLBACK_BODY_SCHEMA,
  parseGatewayCallback,
  type GatewayCallbackPayload,
} from '../payping/gateway-callback';
import {
  CheckoutZohalCompositeDto,
  CreateZohalCompositeDto,
  DecideBlueTickDto,
  TestZohalServiceDto,
  UpdateZohalCompositeDto,
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
      'ساخت/همگام‌سازی محصول پی‌پینگ همه‌ی ماژول‌های فعال (هر ماژول یک محصول مستقل)',
  })
  syncPaypingProducts() {
    return this.zohal.syncPaypingProducts();
  }

  @Post('services/:key/payping-product')
  @ApiOperation({
    summary: 'ساخت/همگام‌سازی محصول پی‌پینگ یک ماژول زحل',
  })
  syncServiceProduct(@Param('key') key: string) {
    return this.zohal.syncServiceProduct(key).then((code) => ({ key, code }));
  }

  @Get('composites')
  @ApiOperation({ summary: 'فهرست محصولات ترکیبی ساخته‌شده از ماژول‌های زحل' })
  listComposites() {
    return this.zohal.listComposites();
  }

  @Post('composites')
  @ApiOperation({ summary: 'ساخت یک محصول ترکیبی از چند ماژول زحل' })
  createComposite(
    @CurrentUser() admin: AuthUser,
    @Body() dto: CreateZohalCompositeDto,
  ) {
    return this.zohal.createComposite(dto, admin.id);
  }

  @Patch('composites/:key')
  @ApiOperation({ summary: 'ویرایش محصول ترکیبی زحل' })
  updateComposite(
    @CurrentUser() admin: AuthUser,
    @Param('key') key: string,
    @Body() dto: UpdateZohalCompositeDto,
  ) {
    return this.zohal.updateComposite(key, dto, admin.id);
  }

  @Delete('composites/:key')
  @ApiOperation({ summary: 'حذف محصول ترکیبی زحل' })
  deleteComposite(@CurrentUser() admin: AuthUser, @Param('key') key: string) {
    return this.zohal.deleteComposite(key, admin.id);
  }

  @Post('composites/:key/payping-product')
  @ApiOperation({ summary: 'ساخت/همگام‌سازی محصول پی‌پینگ یک محصول ترکیبی' })
  syncCompositeProduct(@Param('key') key: string) {
    return this.zohal
      .syncCompositeProduct(key)
      .then((code) => ({ key, code }));
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

@ApiTags('zohal')
@ApiBearerAuth()
@Controller('zohal')
export class ZohalServicesController {
  constructor(private readonly zohal: ZohalService) {}

  @Get('offer')
  @ApiOperation({
    summary: 'فهرست ماژول‌های هزینه‌دار و محصولات ترکیبی قابل خرید',
  })
  offer() {
    return this.zohal.publicOffer();
  }

  @Post('composites/:key/checkout')
  @ApiOperation({
    summary: 'شروع پرداخت یک محصول ترکیبی و اجرای همه‌ی ماژول‌ها پس از پرداخت',
  })
  checkout(
    @CurrentUser() user: AuthUser,
    @Param('key') key: string,
    @Body() dto: CheckoutZohalCompositeDto,
  ) {
    return this.zohal.checkoutComposite(
      user.id,
      key,
      dto.payload ?? {},
      dto.returnTo,
    );
  }

  @Post('services/:key/checkout')
  @ApiOperation({
    summary: 'شروع پرداخت یک ماژول هزینه‌دار زحل و اجرای آن پس از پرداخت',
  })
  checkoutService(
    @CurrentUser() user: AuthUser,
    @Param('key') key: string,
    @Body() dto: CheckoutZohalCompositeDto,
  ) {
    return this.zohal.checkoutService(
      user.id,
      key,
      dto.payload ?? {},
      dto.returnTo,
    );
  }

  @Public()
  @Get('payments/callback')
  @ApiOperation({ summary: 'بازگشت GET از درگاه برای پرداخت محصول ترکیبی' })
  @ApiQuery({ name: 'paymentCode', required: false })
  @ApiQuery({ name: 'refId', required: false })
  @ApiQuery({ name: 'clientRefId', required: false })
  async callbackGet(
    @Query() query: Record<string, unknown>,
    @Res() res: Response,
  ) {
    return this.finishCallback(parseGatewayCallback(query, null), res);
  }

  @Public()
  @Post('payments/callback')
  @ApiOperation({ summary: 'بازگشت POST از درگاه برای پرداخت محصول ترکیبی' })
  @ApiBody({ schema: GATEWAY_CALLBACK_BODY_SCHEMA })
  async callbackPost(
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
    @Res() res: Response,
  ) {
    return this.finishCallback(parseGatewayCallback(query, body), res);
  }

  private async finishCallback(
    payload: GatewayCallbackPayload,
    res: Response,
  ) {
    const result = await this.zohal.handleCompositePaymentCallback(payload);
    res.redirect(302, result.redirectUrl);
  }
}
