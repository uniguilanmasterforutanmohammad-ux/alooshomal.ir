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
import { BiolinksService } from './biolinks.service';
import { CreateBiolinkDto } from './dto/create-biolink.dto';
import { PublicBiolinkQueryDto } from './dto/public-biolink-query.dto';
import { UpdateBiolinkDto } from './dto/update-biolink.dto';

@ApiTags('biolinks')
@Controller('biolinks')
export class BiolinksController {
  constructor(private readonly biolinksService: BiolinksService) {}

  @Post()
  @ApiBearerAuth()
  @RequirePermission('BIOLINK_CREATE')
  @ApiOperation({ summary: 'ساخت بیولینک جدید (وضعیت: در انتظار تأیید مدیر)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBiolinkDto) {
    return this.biolinksService.create(user.id, dto);
  }

  @Get('mine')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'بیولینک‌های من (صفحه‌بندی‌شده)' })
  mine(@CurrentUser() user: AuthUser, @Query() query: PaginationDto) {
    return this.biolinksService.findMyBiolinks(user.id, query.page, query.limit);
  }

  @Get('id/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جزئیات بیولینک من' })
  mineById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.biolinksService.findMineById(user.id, id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @RequirePermission('BIOLINK_EDIT')
  @ApiOperation({ summary: 'ویرایش بیولینک (بازگشت به صف تأیید)' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateBiolinkDto,
  ) {
    return this.biolinksService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @RequirePermission('BIOLINK_EDIT')
  @ApiOperation({ summary: 'حذف بیولینک' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.biolinksService.remove(user.id, id);
  }

  @OptionalAuth()
  @Get('public')
  @ApiOperation({ summary: 'دایرکتوری عمومی بیولینک‌های منتشرشده با جستجو و فیلتر' })
  directory(
    @Query() query: PublicBiolinkQueryDto,
    @Req() request: Request,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.biolinksService.findPublicDirectory(
      query,
      visitorKeyFrom(request),
      user?.id,
    );
  }

  @Public()
  @Get('public/:slug')
  @ApiOperation({ summary: 'مشاهده عمومی بیولینک با slug' })
  async public(@Param('slug') slug: string, @Req() request: Request) {
    const [payload, like] = await Promise.all([
      this.biolinksService.publicBiolinkWithAssets(slug),
      this.biolinksService.likeSummary(slug, visitorKeyFrom(request)),
    ]);
    return { ...payload, like };
  }

  @Public()
  @Post('public/:slug/like')
  @ApiOperation({ summary: 'لایک/برداشتن لایک بیولینک' })
  like(@Param('slug') slug: string, @Req() request: Request) {
    return this.biolinksService.toggleLike(slug, visitorKeyFrom(request));
  }

  @Public()
  @Get('public/:slug/like')
  @ApiOperation({ summary: 'وضعیت لایک بیولینک برای بازدیدکننده جاری' })
  likeState(@Param('slug') slug: string, @Req() request: Request) {
    return this.biolinksService.likeSummary(slug, visitorKeyFrom(request));
  }

  @Get('saved/mine')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'بیولینک‌های ذخیره‌شده من (صفحه‌بندی‌شده)' })
  savedMine(@CurrentUser() user: AuthUser, @Query() query: PaginationDto) {
    return this.biolinksService.findMySaved(user.id, query.page, query.limit);
  }

  @Post('public/:slug/save')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ذخیره/حذف بیولینک از ذخیره‌شده‌های من' })
  save(@CurrentUser() user: AuthUser, @Param('slug') slug: string) {
    return this.biolinksService.toggleSave(slug, user.id);
  }

  @Public()
  @Get('public/:slug/vcard')
  @Header('Content-Type', 'text/vcard; charset=utf-8')
  @ApiOperation({ summary: 'دریافت فایل vCard' })
  async vcard(@Param('slug') slug: string) {
    return this.biolinksService.buildVCard(slug);
  }

  @Public()
  @Post('public/:slug/scan')
  @ApiOperation({ summary: 'ثبت رویداد اسکن بیولینک' })
  async scan(@Param('slug') slug: string, @Req() request: Request) {
    const biolink = await this.biolinksService.findPublicBySlug(slug);
    const rawIp =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      request.socket.remoteAddress ??
      '';
    const ipHash = rawIp
      ? createHash('sha256').update(rawIp).digest('hex').slice(0, 32)
      : undefined;
    await this.biolinksService.recordScan(biolink.id, {
      ipHash,
      userAgent: request.headers['user-agent'],
      referer: request.headers['referer'],
    });
    return { recorded: true };
  }
}
