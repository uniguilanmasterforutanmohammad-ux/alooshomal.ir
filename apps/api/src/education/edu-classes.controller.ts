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
import { CreateClassDto, UpdateClassDto } from './dto/education.dto';
import { EducationService } from './education.service';

@ApiTags('education')
@ApiBearerAuth()
@UseGuards(BusinessModuleGuard)
@RequireModule('eduClasses')
@Controller('edu-classes')
export class EduClassesController {
  constructor(private readonly education: EducationService) {}

  @Get()
  @ApiOperation({ summary: 'فهرست کلاس‌ها و خدمات آموزشی' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('discipline') discipline?: string,
  ) {
    return this.education.listClasses(user.id, { status, discipline });
  }

  @Post()
  @ApiOperation({ summary: 'تعریف کلاس/خدمت جدید' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateClassDto) {
    return this.education.createClass(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'جزئیات کلاس همراه ثبت‌نام‌ها و جلسات' })
  find(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.education.getClass(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش کلاس' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateClassDto,
  ) {
    return this.education.updateClass(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف کلاس' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.education.removeClass(user.id, id);
  }
}
