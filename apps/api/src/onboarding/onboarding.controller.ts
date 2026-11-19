import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  AddOnboardingDocumentDto,
  SaveOnboardingBusinessDto,
  SaveOnboardingStepDataDto,
  SelectOnboardingPlanDto,
  UpdateOnboardingStepsDto,
} from './dto/onboarding.dto';
import { OnboardingService } from './onboarding.service';

@ApiTags('onboarding')
@ApiBearerAuth()
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get('me')
  @ApiOperation({
    summary: 'مراحل «شروع آسان» و وضعیت پیشرفت کاربر جاری',
  })
  mine(@CurrentUser() user: AuthUser) {
    return this.onboarding.getMyProgress(user.id);
  }

  @Post('steps/:id/complete')
  @ApiOperation({ summary: 'تیک‌زدن یک مرحله‌ی سفارشی (مراحل پیش‌فرض خودکارند)' })
  complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.onboarding.completeStep(user.id, id);
  }

  @Post('steps/:id/data')
  @ApiOperation({
    summary:
      'ثبت اطلاعات فرم مرحله‌ی ماژول (استعلام/محصول انتخاب‌شده توسط مدیر) و تکمیل آن مرحله',
  })
  saveStepData(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SaveOnboardingStepDataDto,
  ) {
    return this.onboarding.saveModuleStepData(user.id, id, dto.data);
  }

  @Post('finish')
  @ApiOperation({
    summary: 'ثبت پایان «شروع آسان» و توقف نمایش آن در پنل کاربری',
  })
  finish(@CurrentUser() user: AuthUser) {
    return this.onboarding.finish(user.id);
  }

  @Post('identity/run')
  @ApiOperation({
    summary:
      'اجرای استعلام هویتی که همراه پرداخت ترکیبی خریداری شده (بدون کسر مجدد) و بازگرداندن نتیجه',
  })
  runIdentity(@CurrentUser() user: AuthUser) {
    return this.onboarding.runPendingIdentity(user.id);
  }

  @Post('plan/selected')
  @ApiOperation({
    summary:
      'ثبت انتخاب اشتراک در مرحله‌ی ۴ (شامل پلن رایگان) تا آن مرحله تکمیل‌شده حساب شود',
  })
  selectPlan(
    @CurrentUser() user: AuthUser,
    @Body() dto: SelectOnboardingPlanDto,
  ) {
    return this.onboarding.selectPlan(user.id, dto?.planId);
  }

  @Post('business')
  @ApiOperation({
    summary: 'ثبت/به‌روزرسانی کسب‌وکار «شروع آسان» (فقط فضای کسب‌وکار، بدون کارت/بیولینک)',
  })
  saveBusiness(
    @CurrentUser() user: AuthUser,
    @Body() dto: SaveOnboardingBusinessDto,
  ) {
    return this.onboarding.saveBusiness(user.id, dto);
  }

  @Delete('steps/:id/complete')
  @ApiOperation({ summary: 'برداشتن تیک یک مرحله‌ی سفارشی' })
  uncomplete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.onboarding.uncompleteStep(user.id, id);
  }

  @Post('documents')
  @ApiOperation({
    summary: 'ثبت فایل آپلودشده‌ی مدارک در حساب (برای بررسی تیک آبی)',
  })
  addDocument(
    @CurrentUser() user: AuthUser,
    @Body() dto: AddOnboardingDocumentDto,
  ) {
    return this.onboarding.addDocument(user.id, dto);
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'حذف یک فایل از مدارک حساب' })
  removeDocument(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.onboarding.removeDocument(user.id, id);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/onboarding')
export class AdminOnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get('steps')
  @ApiOperation({ summary: 'مراحل پیکربندی‌شده‌ی «شروع آسان»' })
  async steps() {
    return { steps: await this.onboarding.getSteps() };
  }

  @Get('modules')
  @ApiOperation({
    summary:
      'کتابخانه‌ی ماژول‌ها و محصولات قابل قرار‌گرفتن در مراحل «شروع آسان» (zohal، api.ir، اشتراک‌ها، مدیریت کسب‌وکار، بیولینک و کارت ویزیت)',
  })
  modules() {
    return this.onboarding.getModuleCatalog();
  }

  @Put('steps')
  @ApiOperation({
    summary: 'ذخیره‌ی ترتیب/افزودن/حذف مراحل «شروع آسان»',
  })
  async update(
    @CurrentUser() admin: AuthUser,
    @Body() dto: UpdateOnboardingStepsDto,
  ) {
    return { steps: await this.onboarding.setSteps(dto.steps, admin.id) };
  }
}
