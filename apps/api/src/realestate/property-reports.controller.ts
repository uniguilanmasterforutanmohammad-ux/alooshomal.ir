import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BusinessModuleGuard } from '../business-modules/business-module.guard';
import { RequireModule } from '../business-modules/require-module.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { RealEstateService } from './realestate.service';

@ApiTags('real-estate')
@ApiBearerAuth()
@UseGuards(BusinessModuleGuard)
@RequireModule('propertyReports')
@Controller('property-reports')
export class PropertyReportsController {
  constructor(private readonly realEstate: RealEstateService) {}

  @Get('overview')
  @ApiOperation({ summary: 'داشبورد عملکرد: فایل فعال/کهنه، تقاضای بی‌پیگیری، بازدید، تبدیل و کمیسیون' })
  overview(@CurrentUser() user: AuthUser) {
    return this.realEstate.reportsOverview(user.id);
  }
}
