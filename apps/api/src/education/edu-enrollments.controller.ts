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

import { BusinessModuleGuard } from '../business-modules/business-module.guard';
import { RequireModule } from '../business-modules/require-module.decorator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import {
  CreateEnrollmentDto,
  CreateWaitlistDto,
  UpdateEnrollmentDto,
  UpdateWaitlistDto,
} from './dto/education.dto';
import { EducationService } from './education.service';

@ApiTags('education')
@ApiBearerAuth()
@UseGuards(BusinessModuleGuard)
@RequireModule('eduStudents')
@Controller('edu-enrollments')
export class EduEnrollmentsController {
  constructor(private readonly education: EducationService) {}

  @Get()
  @ApiOperation({ summary: 'فهرست ثبت‌نام‌ها (فیلتر کلاس/هنرجو/وضعیت)' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('classId') classId?: string,
    @Query('studentId') studentId?: string,
    @Query('status') status?: string,
  ) {
    return this.education.listEnrollments(user.id, { classId, studentId, status });
  }

  @Post()
  @ApiOperation({ summary: 'ثبت‌نام هنرجو در کلاس (با کنترل ظرفیت)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEnrollmentDto) {
    return this.education.createEnrollment(user.id, dto);
  }

  @Get('waitlist')
  @ApiOperation({ summary: 'فهرست انتظار کلاس‌های پر (فیلتر کلاس)' })
  waitlist(
    @CurrentUser() user: AuthUser,
    @Query('classId') classId?: string,
  ) {
    return this.education.listWaitlist(user.id, classId);
  }

  @Post('waitlist')
  @ApiOperation({ summary: 'افزودن هنرجو/متقاضی به فهرست انتظار' })
  createWaitlist(@CurrentUser() user: AuthUser, @Body() dto: CreateWaitlistDto) {
    return this.education.createWaitlist(user.id, dto);
  }

  @Patch('waitlist/:id')
  @ApiOperation({ summary: 'تغییر وضعیت عضو فهرست انتظار' })
  updateWaitlist(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateWaitlistDto,
  ) {
    return this.education.updateWaitlist(user.id, id, dto);
  }

  @Delete('waitlist/:id')
  @ApiOperation({ summary: 'حذف از فهرست انتظار' })
  removeWaitlist(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.education.removeWaitlist(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش ثبت‌نام (تخفیف/انقضا/وضعیت)' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateEnrollmentDto,
  ) {
    return this.education.updateEnrollment(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف ثبت‌نام' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.education.removeEnrollment(user.id, id);
  }
}
