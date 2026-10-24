import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
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
import { NewsStatus, SubscriptionStatus } from '@prisma/client';
import type { Request } from 'express';

import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { OptionalAuth } from '../common/decorators/optional-auth.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import { visitorKeyFrom } from '../common/visitor-key';
import { SettingsService } from '../settings/settings.service';
import { MAX_FEED_UPLOAD_BYTES } from '../uploads/uploads.constants';
import { UploadsService } from '../uploads/uploads.service';
import {
  CreateFeedCommentDto,
  CreateFeedPostDto,
  ListFeedCommentsQueryDto,
  ListFeedQueryDto,
} from './dto/feed.dto';
import { FeedsService } from './feeds.service';

// ---------------------------------------------------------------------------
//  Public feed directory + engagement
// ---------------------------------------------------------------------------

@ApiTags('feeds')
@Controller('feeds')
export class FeedsPublicController {
  constructor(private readonly feeds: FeedsService) {}

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'دایرکتوری عمومی فیدها با جستجو و فیلتر موضوع' })
  directory(@Query() query: ListFeedQueryDto) {
    return this.feeds.publicDirectory(query);
  }

  @Public()
  @Get('public/topics')
  @ApiOperation({ summary: 'موضوع‌های فعال فید' })
  topics() {
    return this.feeds.listTopics(true);
  }

  @OptionalAuth()
  @Get('public/:id')
  @ApiOperation({ summary: 'جزئیات یک پست فید منتشرشده' })
  detail(
    @Param('id') id: string,
    @Req() request: Request,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.feeds.publicPost(id, visitorKeyFrom(request), user?.id);
  }

  @OptionalAuth()
  @Get('public/:id/comments')
  @ApiOperation({ summary: 'کامنت‌های تأییدشده یک پست فید (+ کامنت‌های خود کاربر)' })
  comments(
    @Param('id') id: string,
    @Query() query: PaginationDto,
    @CurrentUser() user?: AuthUser,
  ) {
    if (user?.id) return this.feeds.listMyComments(id, user.id);
    return this.feeds.listComments(id, query.page, query.limit);
  }

  @Post('public/:id/comments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ثبت کامنت روی پست فید (در انتظار تأیید مدیر)' })
  createComment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateFeedCommentDto,
  ) {
    return this.feeds.createComment(user.id, id, dto);
  }

  @Delete('public/comments/:commentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف کامنت خودم' })
  removeMyComment(
    @CurrentUser() user: AuthUser,
    @Param('commentId') commentId: string,
  ) {
    return this.feeds.removeComment(user.id, commentId);
  }

  @Public()
  @Post('public/:id/like')
  @ApiOperation({ summary: 'لایک/برداشتن لایک پست فید' })
  like(@Param('id') id: string, @Req() request: Request) {
    return this.feeds.toggleLike(id, visitorKeyFrom(request));
  }

  @Post('public/:id/save')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ذخیره/حذف پست فید از ذخیره‌شده‌های من' })
  save(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.feeds.toggleSave(id, user.id);
  }
}

// ---------------------------------------------------------------------------
//  User panel («فید من»)
// ---------------------------------------------------------------------------

@ApiTags('feeds')
@ApiBearerAuth()
@Controller('feeds/mine')
export class FeedsUserController {
  constructor(
    private readonly feeds: FeedsService,
    private readonly uploads: UploadsService,
    private readonly settings: SettingsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'وضعیت فید من: اشتراک‌ها، بسته‌ها و پست‌های من' })
  mine(@CurrentUser() user: AuthUser) {
    return this.feeds.myOverview(user.id);
  }

  @Get('saved')
  @ApiOperation({ summary: 'پست‌های فید ذخیره‌شده من (صفحه‌بندی‌شده)' })
  saved(@CurrentUser() user: AuthUser, @Query() query: PaginationDto) {
    return this.feeds.findMySaved(user.id, query.page, query.limit);
  }

  @Post('subscriptions/request')
  @ApiOperation({ summary: 'درخواست اشتراک فید (در انتظار تأیید مدیر)' })
  request(
    @CurrentUser() user: AuthUser,
    @Body('packageId') packageId: string,
  ) {
    return this.feeds.requestSubscription(user.id, packageId);
  }

  @Post('uploads')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FEED_UPLOAD_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'آپلود تصویر پست فید (WebP)' })
  async upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const kb = await this.settings.getFeedMaxImageKb();
    return this.uploads.upload('feed', user.id, file, kb * 1024);
  }

  @Post()
  @ApiOperation({ summary: 'ثبت پست فید جدید (در انتظار تأیید مدیر)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateFeedPostDto) {
    return this.feeds.createPost(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش پست فید من (بازگشت به صف بررسی)' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateFeedPostDto,
  ) {
    return this.feeds.updatePost(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف پست فید من' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.feeds.removePost(user.id, id);
  }
}

// ---------------------------------------------------------------------------
//  Admin «فیدها»
// ---------------------------------------------------------------------------

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/feeds')
export class AdminFeedsController {
  constructor(private readonly feeds: FeedsService) {}

  @Get('posts')
  @ApiOperation({ summary: 'همه پست‌های فید (مدیر)' })
  posts(@Query('status') status?: NewsStatus) {
    return this.feeds.adminListPosts(status);
  }

  @Patch('posts/:id/moderate')
  @ApiOperation({ summary: 'تأیید یا رد پست فید' })
  moderate(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body('decision') decision: NewsStatus,
    @Body('reason') reason?: string,
  ) {
    return this.feeds.moderatePost(admin.id, id, decision, reason);
  }

  @Patch('posts/:id/tag-payment')
  @ApiOperation({
    summary: 'تأیید یا رد پرداخت تگ کارت/بیولینک روی پست فید (شبیه‌سازی درگاه)',
  })
  decideTagPayment(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body('decision') decision: 'CONFIRM' | 'REJECT',
  ) {
    return this.feeds.decideTagPayment(admin.id, id, decision);
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: 'حذف پست فید (مدیر)' })
  removePost(@Param('id') id: string) {
    return this.feeds.adminRemovePost(id);
  }

  @Get('comments')
  @ApiOperation({ summary: 'کامنت‌های فید برای بررسی (مدیر)' })
  comments(@Query() query: ListFeedCommentsQueryDto) {
    return this.feeds.adminListComments(query.status, query.page, query.limit);
  }

  @Get('comments/stats')
  @ApiOperation({ summary: 'شمار کامنت‌ها بر اساس وضعیت (مدیر)' })
  commentStats() {
    return this.feeds.commentCounts();
  }

  @Patch('comments/:id/moderate')
  @ApiOperation({ summary: 'تأیید یا رد کامنت فید' })
  moderateComment(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body('decision') decision: NewsStatus,
    @Body('reason') reason?: string,
  ) {
    return this.feeds.moderateComment(admin.id, id, decision, reason);
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: 'حذف کامنت فید (مدیر)' })
  removeComment(@Param('id') id: string) {
    return this.feeds.adminRemoveComment(id);
  }

  @Get('packages')
  @ApiOperation({ summary: 'همه بسته‌های فید (مدیر)' })
  packages() {
    return this.feeds.listPackages(false);
  }

  @Post('packages')
  @ApiOperation({ summary: 'افزودن بسته فید' })
  createPackage(
    @Body()
    body: {
      name: string;
      description?: string;
      price?: number;
      postsQuota: number;
      durationDays?: number;
      isActive?: boolean;
      sortOrder?: number;
    },
  ) {
    return this.feeds.createPackage(body);
  }

  @Patch('packages/:id')
  @ApiOperation({ summary: 'ویرایش بسته فید' })
  updatePackage(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.feeds.updatePackage(id, body);
  }

  @Delete('packages/:id')
  @ApiOperation({ summary: 'حذف بسته فید' })
  removePackage(@Param('id') id: string) {
    return this.feeds.removePackage(id);
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'اشتراک‌های فید کاربران (مدیر)' })
  subscriptions(@Query('status') status?: SubscriptionStatus) {
    return this.feeds.listSubscriptions(status);
  }

  @Patch('subscriptions/:id')
  @ApiOperation({ summary: 'تأیید یا رد اشتراک فید' })
  decideSubscription(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body('decision') decision: SubscriptionStatus,
    @Body('adminNote') adminNote?: string,
  ) {
    return this.feeds.decideSubscription(admin.id, id, decision, adminNote);
  }

  @Get('topics')
  @ApiOperation({ summary: 'مدیریت موضوع‌های فید' })
  topics() {
    return this.feeds.listTopics(false);
  }

  @Post('topics')
  @ApiOperation({ summary: 'افزودن موضوع فید' })
  createTopic(@Body('name') name: string) {
    return this.feeds.createTopic(name);
  }

  @Patch('topics/:id')
  @ApiOperation({ summary: 'ویرایش موضوع فید' })
  updateTopic(
    @Param('id') id: string,
    @Body() body: { name?: string; isActive?: boolean },
  ) {
    return this.feeds.updateTopic(id, body);
  }

  @Delete('topics/:id')
  @ApiOperation({ summary: 'حذف موضوع فید' })
  removeTopic(@Param('id') id: string) {
    return this.feeds.removeTopic(id);
  }
}
