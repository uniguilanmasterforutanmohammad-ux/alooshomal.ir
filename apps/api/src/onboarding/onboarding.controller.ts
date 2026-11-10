import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateOnboardingStepsDto } from './dto/onboarding.dto';
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

  @Delete('steps/:id/complete')
  @ApiOperation({ summary: 'برداشتن تیک یک مرحله‌ی سفارشی' })
  uncomplete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.onboarding.uncompleteStep(user.id, id);
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
