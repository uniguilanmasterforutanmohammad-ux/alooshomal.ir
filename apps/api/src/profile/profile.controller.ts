import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NewsStatus } from '@prisma/client';

import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import { DecideProfileChangeDto, RequestProfileChangeDto } from './dto/profile.dto';
import { ProfileService } from './profile.service';

@ApiTags('profile')
@ApiBearerAuth()
@Controller('profile')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get('me')
  @ApiOperation({ summary: 'پروفایل من + آخرین درخواست تغییر' })
  me(@CurrentUser() user: AuthUser) {
    return this.profile.me(user.id);
  }

  @Post('change-request')
  @RequirePermission('PROFILE_CHANGE_REQUEST')
  @ApiOperation({ summary: 'ثبت درخواست تغییر پروفایل (نیازمند تأیید مدیر)' })
  request(@CurrentUser() user: AuthUser, @Body() dto: RequestProfileChangeDto) {
    return this.profile.requestChange(user.id, dto.fullName);
  }

  @Get('change-request/mine')
  @ApiOperation({ summary: 'آخرین درخواست تغییر پروفایل من' })
  latestMine(@CurrentUser() user: AuthUser) {
    return this.profile.latestMine(user.id);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/profile-requests')
export class AdminProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'درخواست‌های تغییر پروفایل' })
  list(@Query('status') status?: NewsStatus) {
    return this.profile.listRequests(status);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تأیید/رد درخواست تغییر پروفایل' })
  decide(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: DecideProfileChangeDto,
  ) {
    const decision =
      dto.decision === 'APPROVED' ? NewsStatus.APPROVED : NewsStatus.REJECTED;
    return this.profile.decide(admin.id, id, decision, dto.reason);
  }
}
