import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BusinessModuleGuard } from '../business-modules/business-module.guard';
import { RequireModule } from '../business-modules/require-module.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { BuildingsService } from './buildings.service';
import { CreateExpenseDto } from './dto/buildings.dto';

@ApiTags('buildings')
@ApiBearerAuth()
@UseGuards(BusinessModuleGuard)
@RequireModule('buildingFinance')
@Controller('building-finance')
export class BuildingFinanceController {
  constructor(private readonly buildings: BuildingsService) {}

  @Get('overview/:buildingId')
  @ApiOperation({ summary: 'گردش مالی ساختمان: مطالبات، وصولی، هزینه و مانده صندوق' })
  overview(@CurrentUser() user: AuthUser, @Param('buildingId') buildingId: string) {
    return this.buildings.financeOverview(user.id, buildingId);
  }

  @Get('expenses')
  @ApiOperation({ summary: 'فهرست هزینه‌های ساختمان' })
  expenses(
    @CurrentUser() user: AuthUser,
    @Query('buildingId') buildingId?: string,
  ) {
    return this.buildings.listExpenses(user.id, buildingId);
  }

  @Post('expenses')
  @ApiOperation({ summary: 'ثبت هزینه‌ی ساختمان' })
  createExpense(@CurrentUser() user: AuthUser, @Body() dto: CreateExpenseDto) {
    return this.buildings.createExpense(user.id, dto);
  }

  @Delete('expenses/:id')
  @ApiOperation({ summary: 'حذف هزینه' })
  removeExpense(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.buildings.removeExpense(user.id, id);
  }
}
