import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createHash } from 'node:crypto';
import type { Request } from 'express';

import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { OptionalAuth } from '../common/decorators/optional-auth.decorator';
import { Public } from '../common/decorators/public.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { RequirePermission } from '../auth/permissions.decorator';
import { visitorKeyFrom } from '../common/visitor-key';
import { BusinessCardsService } from './business-cards.service';
import { CreateBusinessCardDto } from './dto/create-business-card.dto';
import { PublicBusinessCardQueryDto } from './dto/public-business-card-query.dto';
import { UpdateBusinessCardDto } from './dto/update-business-card.dto';

@ApiTags('business-cards')
@Controller('business-cards')
export class BusinessCardsController {
  constructor(private readonly businessCardsService: BusinessCardsService) {}

  @Post()
  @ApiBearerAuth()
  @RequirePermission('BUSINESS_CARD_CREATE')
  @ApiOperation({ summary: 'ساخت کارت ویزیت جدید (وضعیت: در انتظار تأیید مدیر)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBusinessCardDto) {
    return this.businessCardsService.create(user.id, dto);
  }

  @Get('mine')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'کارت ویزیت‌های من (صفحه‌بندی‌شده)' })
  mine(@CurrentUser() user: AuthUser, @Query() query: PaginationDto) {
    return this.businessCardsService.findMyBusinessCards(user.id, query.page, query.limit);
  }

  @Get('mine/draft')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'آخرین پیش‌نویس کارت ویزیت کاربر برای ادامه‌ی تکمیل (یا null)',
  })
  latestDraft(@CurrentUser() user: AuthUser) {
    return this.businessCardsService.findLatestDraft(user.id);
  }

  @Get('id/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جزئیات کارت ویزیت من' })
  mineById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.businessCardsService.findMineById(user.id, id);
  }

  @Get('linkable/biolinks')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'بیولینک‌های خودِ کاربر برای اتصال به کارت ویزیت (انتخاب‌گر)',
  })
  linkableBiolinks(
    @CurrentUser() user: AuthUser,
    @Query('currentId') currentId?: string,
  ) {
    return this.businessCardsService.linkableBiolinks(user.id, currentId);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @RequirePermission('BUSINESS_CARD_EDIT')
  @ApiOperation({ summary: 'ویرایش کارت ویزیت (بازگشت به صف تأیید)' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessCardDto,
  ) {
    return this.businessCardsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @RequirePermission('BUSINESS_CARD_EDIT')
  @ApiOperation({ summary: 'حذف کارت ویزیت' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.businessCardsService.remove(user.id, id);
  }

  @OptionalAuth()
  @Get('public')
  @ApiOperation({ summary: 'دایرکتوری عمومی کارت ویزیت‌های منتشرشده با جستجو و فیلتر' })
  directory(
    @Query() query: PublicBusinessCardQueryDto,
    @Req() request: Request,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.businessCardsService.findPublicDirectory(
      query,
      visitorKeyFrom(request),
      user?.id,
    );
  }

  @Public()
  @Get('public/batch')
  @ApiOperation({
    summary: 'جزئیات چند کارت ویزیت منتشرشده با slugها (برای گرم‌کردن پنل جزئیات دایرکتوری)',
  })
  publicBatch(@Query('slugs') slugs?: string) {
    // Comma-separated slugs, capped so one request can never fan out unbounded.
    const list = (slugs ?? '')
      .split(',')
      .map((slug) => slug.trim())
      .filter(Boolean)
      .slice(0, 50);
    return this.businessCardsService.findPublicBySlugs(list);
  }

  @Public()
  @Get('public/latest')
  @ApiOperation({ summary: 'آخرین کارت‌های ویزیت منتشرشده (برای اسلایدر صفحه‌ی اصلی)' })
  latest(@Query('limit') limit?: string) {
    const parsed = Number(limit);
    const take = Number.isFinite(parsed)
      ? Math.min(24, Math.max(1, Math.floor(parsed)))
      : 6;
    return this.businessCardsService.findLatestPublished(take);
  }

  @Public()
  @Get('public/:slug')
  @ApiOperation({ summary: 'مشاهده عمومی کارت ویزیت با slug' })
  async public(@Param('slug') slug: string, @Req() request: Request) {
    const [payload, like] = await Promise.all([
      this.businessCardsService.publicBusinessCardWithAssets(slug),
      this.businessCardsService.likeSummary(slug, visitorKeyFrom(request)),
    ]);
    return { ...payload, like };
  }

  @Public()
  @Post('public/:slug/like')
  @ApiOperation({ summary: 'لایک/برداشتن لایک کارت ویزیت' })
  like(@Param('slug') slug: string, @Req() request: Request) {
    return this.businessCardsService.toggleLike(slug, visitorKeyFrom(request));
  }

  @Public()
  @Get('public/:slug/like')
  @ApiOperation({ summary: 'وضعیت لایک کارت ویزیت برای بازدیدکننده جاری' })
  likeState(@Param('slug') slug: string, @Req() request: Request) {
    return this.businessCardsService.likeSummary(slug, visitorKeyFrom(request));
  }

  @OptionalAuth()
  @Get('public/:slug/save')
  @ApiOperation({ summary: 'وضعیت ذخیره‌ی کارت ویزیت برای کاربر جاری' })
  saveState(
    @Param('slug') slug: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.businessCardsService.saveSummary(slug, user?.id);
  }

  @Get('saved/mine')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'کارت‌های ویزیت ذخیره‌شده من (صفحه‌بندی‌شده)' })
  savedMine(@CurrentUser() user: AuthUser, @Query() query: PaginationDto) {
    return this.businessCardsService.findMySaved(user.id, query.page, query.limit);
  }

  @Post('public/:slug/save')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ذخیره/حذف کارت ویزیت از ذخیره‌شده‌های من' })
  save(@CurrentUser() user: AuthUser, @Param('slug') slug: string) {
    return this.businessCardsService.toggleSave(slug, user.id);
  }

  @Public()
  @Get('public/:slug/vcard')
  @Header('Content-Type', 'text/vcard; charset=utf-8')
  @ApiOperation({ summary: 'دریافت فایل vCard' })
  async vcard(@Param('slug') slug: string) {
    return this.businessCardsService.buildVCard(slug);
  }

  @Public()
  @Post('public/:slug/scan')
  @ApiOperation({ summary: 'ثبت رویداد اسکن کارت ویزیت' })
  async scan(@Param('slug') slug: string, @Req() request: Request) {
    const businessCard = await this.businessCardsService.findPublicBySlug(slug);
    const rawIp =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      request.socket.remoteAddress ??
      '';
    const ipHash = rawIp
      ? createHash('sha256').update(rawIp).digest('hex').slice(0, 32)
      : undefined;
    await this.businessCardsService.recordScan(businessCard.id, {
      ipHash,
      userAgent: request.headers['user-agent'],
      referer: request.headers['referer'],
    });
    return { recorded: true };
  }
}
