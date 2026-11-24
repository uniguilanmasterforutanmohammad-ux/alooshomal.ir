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
  CreateSessionDto,
  RecordAttendanceDto,
  UpdateSessionDto,
} from './dto/education.dto';
import { EducationService } from './education.service';

@ApiTags('education')
@ApiBearerAuth()
@UseGuards(BusinessModuleGuard)
@RequireModule('eduAttendance')
@Controller('edu-sessions')
export class EduSessionsController {
  constructor(private readonly education: EducationService) {}

  @Get()
  @ApiOperation({ summary: 'فهرست جلسات کلاس (فیلتر کلاس/وضعیت/بازه)' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('classId') classId?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.education.listSessions(user.id, { classId, status, from, to });
  }

  @Post()
  @ApiOperation({ summary: 'زمان‌بندی جلسه‌ی جدید' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSessionDto) {
    return this.education.createSession(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'جابه‌جایی/لغو/تغییر وضعیت جلسه' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSessionDto,
  ) {
    return this.education.updateSession(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف جلسه' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.education.removeSession(user.id, id);
  }

  @Get(':id/attendance')
  @ApiOperation({ summary: 'فهرست ثبت‌نام‌های کلاس و حضور همان جلسه' })
  attendance(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.education.listAttendance(user.id, id);
  }

  @Post(':id/attendance')
  @ApiOperation({ summary: 'ثبت/به‌روزرسانی حضور یک هنرجو (با بازمحاسبه‌ی اعتبار)' })
  record(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RecordAttendanceDto,
  ) {
    return this.education.recordAttendance(user.id, id, dto);
  }
}
