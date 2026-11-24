import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BusinessModuleGuard } from '../business-modules/business-module.guard';
import { RequireModule } from '../business-modules/require-module.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { BuildingsService } from './buildings.service';
import {
  CreateBudgetDto,
  CreateContractorDto,
  CreateExpenseDto,
  CreateMeetingDto,
  UpdateBudgetDto,
  UpdateContractorDto,
  UpdateMeetingDto,
} from './dto/buildings.dto';

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

  @Get('export/payments')
  @ApiOperation({ summary: 'خروجی CSV پرداخت‌ها (سازگار با اکسل)' })
  async exportPayments(
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
    @Query('buildingId') buildingId?: string,
  ) {
    const csv = await this.buildings.exportPaymentsCsv(user.id, buildingId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="building-payments.csv"');
    res.send(csv);
  }

  @Get(':buildingId/budgets')
  @ApiOperation({ summary: 'فهرست بودجه‌ی سالانه‌ی ساختمان' })
  budgets(
    @CurrentUser() user: AuthUser,
    @Param('buildingId') buildingId: string,
    @Query('year') year?: string,
  ) {
    return this.buildings.listBudgets(user.id, buildingId, year ? Number(year) : undefined);
  }

  @Post(':buildingId/budgets')
  @ApiOperation({ summary: 'افزودن ردیف بودجه' })
  createBudget(
    @CurrentUser() user: AuthUser,
    @Param('buildingId') buildingId: string,
    @Body() dto: CreateBudgetDto,
  ) {
    return this.buildings.createBudget(user.id, buildingId, dto);
  }

  @Patch('budgets/:id')
  @ApiOperation({ summary: 'ویرایش ردیف بودجه' })
  updateBudget(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.buildings.updateBudget(user.id, id, dto);
  }

  @Delete('budgets/:id')
  @ApiOperation({ summary: 'حذف ردیف بودجه' })
  removeBudget(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.buildings.removeBudget(user.id, id);
  }

  @Get(':buildingId/meetings')
  @ApiOperation({ summary: 'فهرست جلسات ساختمان' })
  meetings(
    @CurrentUser() user: AuthUser,
    @Param('buildingId') buildingId: string,
  ) {
    return this.buildings.listMeetings(user.id, buildingId);
  }

  @Post(':buildingId/meetings')
  @ApiOperation({ summary: 'ثبت جلسه‌ی جدید' })
  createMeeting(
    @CurrentUser() user: AuthUser,
    @Param('buildingId') buildingId: string,
    @Body() dto: CreateMeetingDto,
  ) {
    return this.buildings.createMeeting(user.id, buildingId, dto);
  }

  @Patch('meetings/:id')
  @ApiOperation({ summary: 'ویرایش جلسه/صورت‌جلسه/وضعیت' })
  updateMeeting(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateMeetingDto,
  ) {
    return this.buildings.updateMeeting(user.id, id, dto);
  }

  @Delete('meetings/:id')
  @ApiOperation({ summary: 'حذف جلسه' })
  removeMeeting(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.buildings.removeMeeting(user.id, id);
  }

  @Get(':buildingId/contractors')
  @ApiOperation({ summary: 'فهرست پیمانکاران ساختمان' })
  contractors(
    @CurrentUser() user: AuthUser,
    @Param('buildingId') buildingId: string,
  ) {
    return this.buildings.listContractors(user.id, buildingId);
  }

  @Post(':buildingId/contractors')
  @ApiOperation({ summary: 'افزودن پیمانکار' })
  createContractor(
    @CurrentUser() user: AuthUser,
    @Param('buildingId') buildingId: string,
    @Body() dto: CreateContractorDto,
  ) {
    return this.buildings.createContractor(user.id, buildingId, dto);
  }

  @Patch('contractors/:id')
  @ApiOperation({ summary: 'ویرایش پیمانکار' })
  updateContractor(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateContractorDto,
  ) {
    return this.buildings.updateContractor(user.id, id, dto);
  }

  @Delete('contractors/:id')
  @ApiOperation({ summary: 'حذف پیمانکار' })
  removeContractor(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.buildings.removeContractor(user.id, id);
  }
}
