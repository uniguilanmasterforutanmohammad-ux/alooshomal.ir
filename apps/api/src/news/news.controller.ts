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
import { NewsStatus } from '@prisma/client';

import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateNewsDto } from './dto/create-news.dto';
import { ListNewsDto } from './dto/list-news.dto';
import { UpdateNewsAdminDto } from './dto/update-news-admin.dto';
import { NewsService } from './news.service';

// ---------------------------------------------------------------------------
//  Public «نبض شهر»
// ---------------------------------------------------------------------------

@ApiTags('news')
@Controller('news')
export class NewsPublicController {
  constructor(private readonly news: NewsService) {}

  @Public()
  @Get('public/headlines')
  @ApiOperation({ summary: 'تیترهای خبری صفحه اصلی (نبض شهر)' })
  headlines(@Query('limit') limit?: string) {
    return this.news.publicHeadlines(limit ? Number(limit) : undefined);
  }

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'لیست کامل خبرهای منتشرشده با جست‌وجو و فیلتر' })
  list(@Query() query: ListNewsDto) {
    return this.news.publicList(query);
  }

  @Public()
  @Get('public/categories')
  @ApiOperation({ summary: 'دسته‌بندی‌های خبری فعال' })
  categories() {
    return this.news.listCategories(true);
  }

  @Public()
  @Get('public/:id')
  @ApiOperation({ summary: 'جزئیات یک خبر منتشرشده' })
  detail(@Param('id') id: string) {
    return this.news.publicById(id);
  }
}

// ---------------------------------------------------------------------------
//  Reporter panel (city citizen-reporters)
// ---------------------------------------------------------------------------

@ApiTags('news')
@ApiBearerAuth()
@Controller('news/reporter')
export class ReporterController {
  constructor(private readonly news: NewsService) {}

  @Post('request')
  @ApiOperation({ summary: 'درخواست نقش شهروند خبرنگار' })
  request(@CurrentUser() user: AuthUser, @Body('message') message?: string) {
    return this.news.requestReporter(user.id, message);
  }

  @Get('request/mine')
  @ApiOperation({ summary: 'آخرین وضعیت درخواست شهروند خبرنگار من' })
  status(@CurrentUser() user: AuthUser) {
    return this.news.reporterStatus(user.id);
  }

  @UseGuards(RolesGuard)
  @Roles('CITIZEN_REPORTER', 'ADMIN')
  @Get('mine')
  @ApiOperation({ summary: 'خبرهای من' })
  mine(@CurrentUser() user: AuthUser, @Query() query: ListNewsDto) {
    return this.news.listMine(user.id, query);
  }

  @UseGuards(RolesGuard)
  @Roles('CITIZEN_REPORTER', 'ADMIN')
  @Get('mine/summary')
  @ApiOperation({ summary: 'خلاصه وضعیت خبرهای من' })
  summary(@CurrentUser() user: AuthUser) {
    return this.news.summaryForReporter(user.id);
  }

  @Post('mine')
  @ApiOperation({
    summary: 'ثبت خبر جدید (بر اساس سطح دسترسی تنظیمات نبض شهر)',
  })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateNewsDto) {
    return this.news.createMine(user.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('CITIZEN_REPORTER', 'ADMIN')
  @Patch('mine/:id')
  @ApiOperation({ summary: 'ویرایش خبر من (بازگشت به صف بررسی)' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateNewsDto,
  ) {
    return this.news.updateMine(user.id, id, dto);
  }
}

// ---------------------------------------------------------------------------
//  Admin «نبض شهر»
// ---------------------------------------------------------------------------

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/news')
export class AdminNewsController {
  constructor(private readonly news: NewsService) {}

  @Get()
  @ApiOperation({ summary: 'همه خبرهای سایت (مدیر)' })
  list(@Query() query: ListNewsDto) {
    return this.news.adminList(query);
  }

  // NOTE: static routes must be declared before the `:id` routes below,
  // otherwise `/admin/news/categories` would match `GET :id`.
  @Get('reporter-requests')
  @ApiOperation({ summary: 'درخواست‌های شهروند خبرنگار' })
  reporterRequests(@Query('status') status?: NewsStatus) {
    return this.news.listReporterRequests(status);
  }

  @Patch('reporter-requests/:id')
  @ApiOperation({ summary: 'تأیید یا رد درخواست شهروند خبرنگار' })
  decideReporter(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body('decision') decision: NewsStatus,
    @Body('reason') reason?: string,
  ) {
    return this.news.decideReporterRequest(admin.id, id, decision, reason);
  }

  @Get('categories')
  @ApiOperation({ summary: 'مدیریت دسته‌بندی‌های خبری' })
  categories() {
    return this.news.listCategories(false);
  }

  @Post('categories')
  @ApiOperation({ summary: 'افزودن دسته‌بندی خبری' })
  createCategory(@Body('name') name: string) {
    return this.news.createCategory(name);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'ویرایش دسته‌بندی خبری' })
  updateCategory(
    @Param('id') id: string,
    @Body() data: { name?: string; isActive?: boolean },
  ) {
    return this.news.updateCategory(id, data);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'حذف دسته‌بندی خبری' })
  removeCategory(@Param('id') id: string) {
    return this.news.removeCategory(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'جزئیات یک خبر برای مدیر (هر وضعیتی)' })
  detail(@Param('id') id: string) {
    return this.news.adminById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش خبر توسط مدیر (بدون بازگشت به صف بررسی)' })
  update(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateNewsAdminDto,
  ) {
    return this.news.adminUpdate(admin.id, id, dto);
  }

  @Patch(':id/moderate')
  @ApiOperation({ summary: 'تأیید یا رد خبر (مدیر)' })
  moderate(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body('decision') decision: NewsStatus,
    @Body('reason') reason?: string,
  ) {
    return this.news.moderate(admin.id, id, decision, reason);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف خبر (مدیر)' })
  remove(@Param('id') id: string) {
    return this.news.remove(id);
  }
}
