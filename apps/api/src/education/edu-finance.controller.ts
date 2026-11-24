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
import {
  CreateEduExpenseDto,
  CreateSettlementDto,
  UpdateSettlementDto,
} from './dto/education.dto';
import { EducationService } from './education.service';

@ApiTags('education')
@ApiBearerAuth()
@UseGuards(BusinessModuleGuard)
@RequireModule('eduFinance')
@Controller('edu-finance')
export class EduFinanceController {
  constructor(private readonly education: EducationService) {}

  @Get('expenses')
  @ApiOperation({ summary: 'فهرست هزینه‌های کلاس/آموزشگاه' })
  expenses(@CurrentUser() user: AuthUser, @Query('classId') classId?: string) {
    return this.education.listExpenses(user.id, classId);
  }

  @Post('expenses')
  @ApiOperation({ summary: 'ثبت هزینه‌ی کلاس (اجاره سالن، مواد، دستمزد…)' })
  createExpense(@CurrentUser() user: AuthUser, @Body() dto: CreateEduExpenseDto) {
    return this.education.createExpense(user.id, dto);
  }

  @Delete('expenses/:id')
  @ApiOperation({ summary: 'حذف هزینه' })
  removeExpense(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.education.removeExpense(user.id, id);
  }

  @Get('settlements')
  @ApiOperation({ summary: 'فهرست تسویه‌ی مربیان' })
  settlements(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    return this.education.listSettlements(user.id, status);
  }

  @Post('settlements')
  @ApiOperation({ summary: 'ثبت تسویه‌ی مربی' })
  createSettlement(@CurrentUser() user: AuthUser, @Body() dto: CreateSettlementDto) {
    return this.education.createSettlement(user.id, dto);
  }

  @Patch('settlements/:id')
  @ApiOperation({ summary: 'تغییر وضعیت/مبلغ تسویه' })
  updateSettlement(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSettlementDto,
  ) {
    return this.education.updateSettlement(user.id, id, dto);
  }

  @Delete('settlements/:id')
  @ApiOperation({ summary: 'حذف تسویه' })
  removeSettlement(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.education.removeSettlement(user.id, id);
  }
}
