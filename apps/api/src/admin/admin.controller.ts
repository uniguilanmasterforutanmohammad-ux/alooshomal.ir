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
import { BoostStatus, SubscriptionStatus } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateBiolinkDto } from '../biolinks/dto/update-biolink.dto';
import { UpdateBusinessCardDto } from '../businesscards/dto/update-business-card.dto';
import { BoostsService } from '../boosts/boosts.service';
import { DecideBoostDto } from '../boosts/dto/decide-boost.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreatePlanDto } from '../subscriptions/dto/create-plan.dto';
import { DecideSubscriptionDto } from '../subscriptions/dto/decide-subscription.dto';
import { UpdatePlanDto } from '../subscriptions/dto/update-plan.dto';
import { AdminService } from './admin.service';
import { ListBiolinksDto } from './dto/list-biolinks.dto';
import { ListBusinessCardsDto } from './dto/list-business-cards.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { SetUserActiveDto, SetUserCommentDto } from './dto/manage-user.dto';
import { ModerateBiolinkDto } from './dto/moderate-biolink.dto';
import { ModerateBusinessCardDto } from './dto/moderate-business-card.dto';

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
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'آمار کلی سامانه' })
  stats() {
    return this.adminService.stats();
  }

  @Get('overview')
  @ApiOperation({ summary: 'نمای کلی پلتفرم برای داشبورد مدیر' })
  async overview() {
    const [stats, recentUsers, recentTickets, reports, signups] =
      await Promise.all([
        this.adminService.stats(),
        this.adminService.recentUsers(),
        this.adminService.recentTickets(),
        this.adminService.recentReports(),
        this.adminService.signupSeries(),
      ]);
    return { stats, recentUsers, recentTickets, reports, signups };
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

  @Delete('users/:id')
  @ApiOperation({ summary: 'حذف کاربر' })
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('reports')
  @ApiOperation({ summary: 'گزارش‌های سیستم' })
  reports(@Query('limit') limit?: string) {
    return this.adminService.recentReports(limit ? Number(limit) : 50);
  }

  @Get('biolinks')
  @ApiOperation({ summary: 'فهرست بیولینک‌ها برای بررسی' })
  biolinks(@Query() query: ListBiolinksDto) {
    return this.adminService.listBiolinks(query, query.status);
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
    return this.adminService.listBusinessCards(query, query.status);
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
}
