import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
@Controller('property-audits')
export class PropertyAuditsController {
  constructor(private readonly realEstate: RealEstateService) {}

  @Get()
  @ApiOperation({ summary: 'سابقه‌ی دسترسی به اطلاعات حساس (تماس مالک، انتشار آگهی)' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
  ) {
    return this.realEstate.listAudits(user.id, {
      action,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
