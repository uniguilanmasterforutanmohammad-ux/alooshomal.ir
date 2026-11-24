import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BusinessModuleGuard } from '../business-modules/business-module.guard';
import { RequireModule } from '../business-modules/require-module.decorator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { EducationService } from './education.service';

@ApiTags('education')
@ApiBearerAuth()
@UseGuards(BusinessModuleGuard)
@RequireModule('eduReports')
@Controller('edu-reports')
export class EduReportsController {
  constructor(private readonly education: EducationService) {}

  @Get('overview')
  @ApiOperation({ summary: 'داشبورد آموزش: ظرفیت، حضور، مطالبات، وصولی و سود کلاس' })
  overview(@CurrentUser() user: AuthUser) {
    return this.education.reportsOverview(user.id);
  }
}
