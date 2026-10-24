import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdPlacement, BoostStatus, SubscriptionStatus } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateBiolinkDto } from '../biolinks/dto/update-biolink.dto';
import { UpdateBusinessCardDto } from '../businesscards/dto/update-business-card.dto';
import { BoostsService } from '../boosts/boosts.service';
import { DecideBoostDto } from '../boosts/dto/decide-boost.dto';
import { AdsService } from '../ads/ads.service';
import { DecideAdDto } from '../ads/dto/decide-ad.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreatePlanDto } from '../subscriptions/dto/create-plan.dto';
import { DecideSubscriptionDto } from '../subscriptions/dto/decide-subscription.dto';
import { UpdatePlanDto } from '../subscriptions/dto/update-plan.dto';
import { PLAN_FIELDS } from '../common/plans';
import { PermissionsService } from '../auth/permissions.service';
import {
  APP_ROLES,
  PERMISSION_META,
  PERMISSION_SUBJECTS,
  ROLE_LABELS,
} from '../auth/permissions';
import { MODERATOR_SCOPE_META, normalizeScopes } from '../auth/moderator-scopes';
import { AdminService } from './admin.service';
import { BulkKind, BulkService } from './bulk.service';
import { ListBiolinksDto } from './dto/list-biolinks.dto';
import { ListBusinessCardsDto } from './dto/list-business-cards.dto';
import { ListUsersDto } from './dto/list-users.dto';
import {
  SetUserActiveDto,
  SetUserCommentDto,
  SetUserRoleDto,
} from './dto/manage-user.dto';
import { ModerateBiolinkDto } from './dto/moderate-biolink.dto';
import { ModerateBusinessCardDto } from './dto/moderate-business-card.dto';
import {
  CreateModeratorDto,
  UpdateModeratorDto,
} from './dto/manage-moderator.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly boostsService: BoostsService,
    private readonly adsService: AdsService,
    private readonly bulkService: BulkService,
    private readonly permissions: PermissionsService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'آمار کلی سامانه' })
  stats() {
    return this.adminService.stats();
  }

  @Get('revenue')
  @ApiOperation({ summary: 'گزارش درآمد تخمینی هر مدل درآمدی' })
  revenue() {
    return this.adminService.revenueReport();
  }

  @Get('storage')
  @ApiOperation({
    summary: 'وضعیت ذخیره‌سازی رسانه (حجم آپلودها) و فضای دیسک سرور',
  })
  storage() {
    return this.adminService.storageOverview();
  }

  @Get('overview')
  @ApiOperation({ summary: 'نمای کلی پلتفرم برای داشبورد مدیر' })
  async overview() {
    const [stats, recentUsers, recentTickets, reports, signupSeries] =
      await Promise.all([
        this.adminService.stats(),
        this.adminService.recentUsers(),
        this.adminService.recentTickets(),
        this.adminService.recentReports(),
        this.adminService.signupSeries(),
      ]);
    return { stats, recentUsers, recentTickets, reports, signupSeries };
  }

  @Get('users')
  @ApiOperation({ summary: 'لیست کاربران با صفحه‌بندی و جستجو' })
  users(@Query() query: ListUsersDto) {
    return this.adminService.listUsers(query, query.search);
  }

  @Patch('users/:id/active')
  @ApiOperation({ summary: 'فعال/غیرفعال‌سازی حساب کاربر (با علت)' })
  setUserActive(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: SetUserActiveDto,
  ) {
    return this.adminService.setUserActive(admin.id, id, dto.isActive, dto.reason);
  }

  @Patch('users/:id/comment')
  @ApiOperation({ summary: 'ثبت کامنت مدیر درباره کاربر' })
  setUserComment(@Param('id') id: string, @Body() dto: SetUserCommentDto) {
    return this.adminService.setUserComment(id, dto.comment ?? null);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'تغییر نقش کاربر' })
  setUserRole(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: SetUserRoleDto,
  ) {
    return this.adminService.setUserRole(admin.id, id, dto.role);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'حذف کاربر' })
  deleteUser(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.adminService.deleteUser(admin.id, id);
  }

  @Get('users/:id/sessions')
  @ApiOperation({ summary: 'نشست‌های فعال یک کاربر' })
  userSessions(@Param('id') id: string) {
    return this.adminService.listUserSessions(id);
  }

  @Delete('users/:id/sessions')
  @ApiOperation({ summary: 'خروج اجباری کاربر از همه‌ی دستگاه‌ها' })
  revokeUserSessions(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.adminService.revokeUserSessions(admin.id, id);
  }

  @Get('reports')
  @ApiOperation({ summary: 'گزارش‌های سیستم' })
  reports(@Query('limit') limit?: string) {
    return this.adminService.recentReports(limit ? Number(limit) : 50);
  }

  @Get('biolinks')
  @ApiOperation({ summary: 'فهرست بیولینک‌ها برای بررسی' })
  biolinks(@Query() query: ListBiolinksDto) {
    return this.adminService.listBiolinks(query, query.status, query.search);
  }

  @Patch('biolinks/:id/moderate')
  @ApiOperation({ summary: 'تأیید یا رد بیولینک (با ثبت زمان و دلیل)' })
  moderate(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: ModerateBiolinkDto,
  ) {
    return this.adminService.moderate(admin.id, id, dto);
  }

  @Get('biolinks/:id')
  @ApiOperation({ summary: 'جزئیات کامل بیولینک برای بررسی مدیر' })
  biolink(@Param('id') id: string) {
    return this.adminService.getBiolink(id);
  }

  @Patch('biolinks/:id')
  @ApiOperation({ summary: 'ویرایش زنده فیلدهای بیولینک توسط مدیر' })
  updateBiolink(@Param('id') id: string, @Body() dto: UpdateBiolinkDto) {
    return this.adminService.updateBiolink(id, dto);
  }

  @Get('business-cards')
  @ApiOperation({ summary: 'فهرست کارت‌های ویزیت برای بررسی' })
  businessCards(@Query() query: ListBusinessCardsDto) {
    return this.adminService.listBusinessCards(query, query.status, query.search);
  }

  @Patch('business-cards/:id/moderate')
  @ApiOperation({ summary: 'تأیید یا رد کارت ویزیت (با ثبت زمان و دلیل)' })
  moderateBusinessCard(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: ModerateBusinessCardDto,
  ) {
    return this.adminService.moderateBusinessCard(admin.id, id, dto);
  }

  @Get('business-cards/:id')
  @ApiOperation({ summary: 'جزئیات کامل کارت ویزیت برای بررسی مدیر' })
  businessCard(@Param('id') id: string) {
    return this.adminService.getBusinessCard(id);
  }

  @Patch('business-cards/:id')
  @ApiOperation({ summary: 'ویرایش زنده فیلدهای کارت ویزیت توسط مدیر' })
  updateBusinessCard(
    @Param('id') id: string,
    @Body() dto: UpdateBusinessCardDto,
  ) {
    return this.adminService.updateBusinessCard(id, dto);
  }

  // ----- Subscriptions -----

  @Get('plans')
  @ApiOperation({ summary: 'فهرست همه اشتراک‌ها (فعال و غیرفعال)' })
  plans() {
    return this.subscriptionsService.listPlans(false);
  }

  @Get('plan-fields')
  @ApiOperation({ summary: 'فهرست فیلدهای قابل نمایش در بسته‌های اشتراک' })
  planFields() {
    return PLAN_FIELDS;
  }

  @Post('plans')
  @ApiOperation({ summary: 'ساخت اشتراک جدید' })
  createPlan(@Body() dto: CreatePlanDto) {
    return this.subscriptionsService.createPlan(dto);
  }

  @Patch('plans/:id')
  @ApiOperation({ summary: 'ویرایش اشتراک' })
  updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.subscriptionsService.updatePlan(id, dto);
  }

  @Delete('plans/:id')
  @ApiOperation({ summary: 'حذف اشتراک (اگر به کاربری تخصیص نیافته باشد)' })
  removePlan(@Param('id') id: string) {
    return this.subscriptionsService.removePlan(id);
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'درخواست‌های اشتراک کاربران' })
  subscriptions(@Query('status') status?: SubscriptionStatus) {
    return this.subscriptionsService.listRequests(status);
  }

  @Patch('subscriptions/:id')
  @ApiOperation({ summary: 'تأیید یا رد درخواست اشتراک' })
  decideSubscription(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: DecideSubscriptionDto,
  ) {
    return this.subscriptionsService.decideRequest(admin.id, id, dto);
  }

  @Patch('users/:id/plan')
  @ApiOperation({ summary: 'تخصیص مستقیم اشتراک به کاربر' })
  assignPlan(
    @Param('id') id: string,
    @Body() body: { planId?: string | null },
  ) {
    return this.subscriptionsService.assignPlan(id, body.planId ?? null);
  }

  // ----- Boosts (“پله”) -----

  @Get('boosts')
  @ApiOperation({ summary: 'درخواست‌های افزایش بازدید (پله)' })
  boosts(@Query('status') status?: BoostStatus) {
    return this.boostsService.listRequests(status);
  }

  @Patch('boosts/:id')
  @ApiOperation({ summary: 'تأیید یا رد درخواست پله' })
  decideBoost(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: DecideBoostDto,
  ) {
    return this.boostsService.decide(admin.id, id, dto);
  }

  // ----- Ads (تبلیغات) -----

  @Get('ads')
  @ApiOperation({ summary: 'درخواست‌های تبلیغ (صفحه اصلی یا دایرکتوری)' })
  ads(
    @Query('status') status?: BoostStatus,
    @Query('placement') placement?: AdPlacement,
  ) {
    return this.adsService.listRequests(status, placement);
  }

  @Patch('ads/:id')
  @ApiOperation({ summary: 'تأیید یا رد درخواست تبلیغ' })
  decideAd(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: DecideAdDto,
  ) {
    return this.adsService.decide(admin.id, id, dto);
  }

  // ----- Bulk import / delete (load-testing) -----

  @Get('bulk/counts')
  @ApiOperation({ summary: 'تعداد داده‌های تستی ایمپورت‌شده' })
  bulkCounts() {
    return this.bulkService.counts();
  }

  @Post('bulk/import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'ایمپورت گروهی بیولینک/کارت ویزیت از فایل اکسل یا CSV' })
  bulkImport(
    @UploadedFile() file: Express.Multer.File,
    @Body('kind') kind: BulkKind,
    @Body('ownerUserId') ownerUserId: string,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('فایلی آپلود نشده است');
    }
    if (kind !== 'BIOLINK' && kind !== 'BUSINESS_CARD') {
      throw new BadRequestException('نوع ایمپورت باید BIOLINK یا BUSINESS_CARD باشد');
    }
    if (!ownerUserId) {
      throw new BadRequestException('کاربر مالک ردیف‌های ایمپورت‌شده را انتخاب کنید');
    }
    return this.bulkService.importRows(kind, ownerUserId, file.buffer);
  }

  @Delete('bulk/test-data')
  @ApiOperation({ summary: 'حذف گروهی داده‌های تستی ایمپورت‌شده' })
  bulkDelete(@Query('kind') kind?: BulkKind | 'ALL') {
    return this.bulkService.deleteTestData(kind ?? 'ALL');
  }

  // ----- Role permission matrix -----

  // ----- Limited admin accounts («کاربر ادمین») -----

  @Get('moderators')
  @ApiOperation({ summary: 'فهرست کاربران ادمین محدود' })
  async listModerators() {
    const items = await this.adminService.listModerators();
    return {
      items,
      scopeMeta: MODERATOR_SCOPE_META,
    };
  }

  @Post('moderators')
  @ApiOperation({ summary: 'ایجاد کاربر ادمین محدود با تعیین سطح دسترسی' })
  createModerator(
    @CurrentUser() admin: AuthUser,
    @Body() dto: CreateModeratorDto,
  ) {
    return this.adminService.createModerator(admin.id, {
      email: dto.email,
      password: dto.password,
      fullName: dto.fullName,
      scopes: normalizeScopes(dto.scopes),
    });
  }

  @Patch('moderators/:id')
  @ApiOperation({ summary: 'ویرایش سطح دسترسی / وضعیت کاربر ادمین' })
  updateModerator(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateModeratorDto,
  ) {
    return this.adminService.updateModerator(admin.id, id, {
      scopes: dto.scopes ? normalizeScopes(dto.scopes) : undefined,
      isActive: dto.isActive,
      fullName: dto.fullName,
      password: dto.password,
    });
  }

  @Delete('moderators/:id')
  @ApiOperation({ summary: 'حذف کاربر ادمین محدود' })
  deleteModerator(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.adminService.deleteModerator(admin.id, id);
  }

  @Get('permissions')
  @ApiOperation({ summary: 'ماتریس سطوح دسترسی نقش‌ها' })
  async getPermissions() {
    const matrix = await this.permissions.getMatrix();
    return {
      matrix,
      roles: APP_ROLES.map((role) => ({ role, label: ROLE_LABELS[role] })),
      subjects: PERMISSION_META,
      subjectsOrder: PERMISSION_SUBJECTS,
    };
  }

  @Patch('permissions')
  @ApiOperation({ summary: 'به‌روزرسانی ماتریس سطوح دسترسی' })
  async updatePermissions(
    @Body() body: { matrix?: Record<string, Record<string, boolean>> },
  ) {
    const input = body?.matrix ?? {};
    const clean: Partial<Record<(typeof APP_ROLES)[number], Record<string, boolean>>> = {};
    for (const role of APP_ROLES) {
      const roleInput = input[role];
      if (!roleInput || typeof roleInput !== 'object') continue;
      const cells: Record<string, boolean> = {};
      for (const subject of PERMISSION_SUBJECTS) {
        if (typeof roleInput[subject] === 'boolean') {
          cells[subject] = roleInput[subject];
        }
      }
      clean[role] = cells;
    }
    const matrix = await this.permissions.setMatrix(clean);
    return { matrix };
  }
}
