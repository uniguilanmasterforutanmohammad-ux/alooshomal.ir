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
  @ApiOperation({ summary: 'کارت ویزیت‌های من' })
  mine(@CurrentUser() user: AuthUser) {
    return this.businessCardsService.findMyBusinessCards(user.id);
  }

  @Get('id/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جزئیات کارت ویزیت من' })
  mineById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.businessCardsService.findMineById(user.id, id);
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

  @Get('saved/mine')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'کارت‌های ویزیت ذخیره‌شده من' })
  savedMine(@CurrentUser() user: AuthUser) {
    return this.businessCardsService.findMySaved(user.id);
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
