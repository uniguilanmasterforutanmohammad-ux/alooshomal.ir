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
import { CreateProgressDto, UpdateProgressDto } from './dto/education.dto';
import { EducationService } from './education.service';

@ApiTags('education')
@ApiBearerAuth()
@UseGuards(BusinessModuleGuard)
@RequireModule('eduStudents')
@Controller('edu-progress')
export class EduProgressController {
  constructor(private readonly education: EducationService) {}

  @Get()
  @ApiOperation({ summary: 'یادداشت‌های برنامه/پیشرفت یک ثبت‌نام' })
  list(@CurrentUser() user: AuthUser, @Query('enrollmentId') enrollmentId: string) {
    return this.education.listProgress(user.id, enrollmentId);
  }

  @Post()
  @ApiOperation({ summary: 'ثبت موضوع جلسه، تمرین و بازخورد' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProgressDto) {
    return this.education.createProgress(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش یادداشت پیشرفت' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.education.updateProgress(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف یادداشت پیشرفت' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.education.removeProgress(user.id, id);
  }
}
