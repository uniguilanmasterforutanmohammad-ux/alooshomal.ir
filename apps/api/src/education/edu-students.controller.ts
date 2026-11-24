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
import { CreateStudentDto, UpdateStudentDto } from './dto/education.dto';
import { EducationService } from './education.service';

@ApiTags('education')
@ApiBearerAuth()
@UseGuards(BusinessModuleGuard)
@RequireModule('eduStudents')
@Controller('edu-students')
export class EduStudentsController {
  constructor(private readonly education: EducationService) {}

  @Get()
  @ApiOperation({ summary: 'فهرست هنرجویان' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('q') q?: string,
  ) {
    return this.education.listStudents(user.id, { status, q });
  }

  @Post()
  @ApiOperation({ summary: 'ثبت پرونده‌ی هنرجوی جدید' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateStudentDto) {
    return this.education.createStudent(user.id, dto);
  }

  @Post(':id/access-token')
  @ApiOperation({ summary: 'ساخت/بازگرداندن توکن پنل هنرجو/ولی' })
  accessToken(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.education.ensureStudentToken(user.id, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'جزئیات هنرجو همراه ثبت‌نام‌ها، پرداخت‌ها و پیشرفت' })
  find(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.education.getStudent(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش پرونده‌ی هنرجو' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.education.updateStudent(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف هنرجو' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.education.removeStudent(user.id, id);
  }
}
