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

import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminSetModuleDto } from './dto/admin-set-module.dto';
import { AdminSetPriceDto } from './dto/admin-set-price.dto';
import {
  AddManagementModuleDto,
  CreateManagementDto,
  UpdateManagementDto,
} from './dto/admin-management.dto';
import { BusinessModulesService } from './business-modules.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/business-modules')
export class AdminBusinessModulesController {
  constructor(private readonly modules: BusinessModulesService) {}

  @Get('catalog')
  @ApiOperation({
    summary: 'کاتالوگ کامل ماژول‌ها با قیمت و تعداد کسب‌وکارهای فعال',
  })
  catalog() {
    return this.modules.adminCatalog();
  }

  @Get('managements')
  @ApiOperation({
    summary:
      'کارت‌های «مدیریت کسب‌وکار» با ماژول‌ها، قیمت کل و وضعیت محصول پی‌پینگ',
  })
  managements() {
    return this.modules.adminManagements();
  }

  @Post('managements')
  @ApiOperation({ summary: 'ساخت یک «مدیریت کسب‌وکار» جدید' })
  createManagement(@Body() dto: CreateManagementDto) {
    return this.modules.adminCreateManagement(dto);
  }

  @Patch('managements/:key')
  @ApiOperation({
    summary: 'ویرایش نام/توضیح/نمایش/تخفیف دوره‌ها و ماژول‌های یک مدیریت',
  })
  updateManagement(
    @Param('key') key: string,
    @Body() dto: UpdateManagementDto,
  ) {
    return this.modules.adminUpdateManagement(key, dto);
  }

  @Delete('managements/:key')
  @ApiOperation({
    summary:
      'حذف کامل یک مدیریت کسب‌وکار (کسب‌وکارهای وابسته به مدیریت پایه منتقل می‌شوند)',
  })
  deleteManagement(@Param('key') key: string) {
    return this.modules.adminDeleteManagement(key);
  }

  @Post('managements/:key/modules')
  @ApiOperation({ summary: 'افزودن یک ماژول به مدیریت کسب‌وکار' })
  addManagementModule(
    @Param('key') key: string,
    @Body() dto: AddManagementModuleDto,
  ) {
    return this.modules.adminAddManagementModule(key, dto.moduleKey);
  }

  @Delete('managements/:key/modules/:moduleKey')
  @ApiOperation({ summary: 'حذف یک ماژول از مدیریت کسب‌وکار' })
  removeManagementModule(
    @Param('key') key: string,
    @Param('moduleKey') moduleKey: string,
  ) {
    return this.modules.adminRemoveManagementModule(key, moduleKey);
  }

  @Post('managements/:key/sync-payping')
  @ApiOperation({
    summary:
      'همگام‌سازی کارت مدیریت با پی‌پینگ: ساخت/به‌روزرسانی محصول با مجموع قیمت ماژول‌ها',
  })
  syncManagementPayping(@Param('key') key: string) {
    return this.modules.syncManagementPayping(key);
  }

  @Get('workspaces')
  @ApiOperation({
    summary:
      'فهرست کسب‌وکارها و ماژول‌های فعال هرکدام (جست‌وجو با q و فیلتر مالک با ownerId)',
  })
  workspaces(
    @Query('q') q?: string,
    @Query('take') take?: string,
    @Query('ownerId') ownerId?: string,
  ) {
    return this.modules.adminListWorkspaces({
      q,
      take: take ? Number.parseInt(take, 10) : undefined,
      ownerId,
    });
  }

  @Patch('workspaces/:id/modules/:key')
  @ApiOperation({ summary: 'فعال/غیرفعال‌کردن یک ماژول برای یک کسب‌وکار' })
  setModule(
    @Param('id') id: string,
    @Param('key') key: string,
    @Body() dto: AdminSetModuleDto,
  ) {
    return this.modules.adminSetModule(id, key, dto.enabled);
  }

  @Get('prices')
  @ApiOperation({ summary: 'فهرست قیمت‌های تعیین‌شده‌ی ماژول‌ها' })
  prices() {
    return this.modules.adminListPrices();
  }

  @Patch('prices/:key')
  @ApiOperation({ summary: 'تعیین/ویرایش قیمت یک «مدیریت کسب‌وکار»' })
  setPrice(@Param('key') key: string, @Body() dto: AdminSetPriceDto) {
    return this.modules.adminSetPrice(key, dto);
  }

  @Get('name-requests')
  @ApiOperation({
    summary: 'درخواست‌های تغییر نام نمایشی کسب‌وکار در انتظار تأیید',
  })
  nameRequests() {
    return this.modules.listNameRequests();
  }

  @Post('name-requests/:id/approve')
  @ApiOperation({ summary: 'تأیید تغییر نام نمایشی کسب‌وکار' })
  approveName(@Param('id') id: string) {
    return this.modules.approveNameRequest(id);
  }

  @Post('name-requests/:id/reject')
  @ApiOperation({ summary: 'رد درخواست تغییر نام نمایشی کسب‌وکار' })
  rejectName(@Param('id') id: string) {
    return this.modules.rejectNameRequest(id);
  }
}
