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
import { CreateEnrollmentDto, UpdateEnrollmentDto } from './dto/education.dto';
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
