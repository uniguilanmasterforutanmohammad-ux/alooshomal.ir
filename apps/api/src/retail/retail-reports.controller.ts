import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BusinessModuleGuard } from '../business-modules/business-module.guard';
import { RequireModule } from '../business-modules/require-module.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { RetailService } from './retail.service';

@ApiTags('retail')
@ApiBearerAuth()
@UseGuards(BusinessModuleGuard)
@RequireModule('retailReports')
@Controller('retail/reports')
export class RetailReportsController {
  constructor(private readonly retail: RetailService) {}

  @Get('overview')
  @ApiOperation({
    summary:
      'داشبورد فروشگاه: فروش خالص، سود سفارش، واریزی‌های تطبیق‌نیافته، کالای کم‌موجود و گزارش روزانه',
  })
  overview(@CurrentUser() user: AuthUser) {
    return this.retail.reportsOverview(user.id);
  }
}
