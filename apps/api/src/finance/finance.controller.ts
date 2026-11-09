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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateManualInvoiceDto } from './dto/create-manual-invoice.dto';
import { FinanceSummaryQueryDto } from './dto/finance-summary-query.dto';
import { ListFinanceDto } from './dto/list-finance.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { VoidInvoiceDto } from './dto/void-invoice.dto';
import { EXPENSE_CATEGORY_SUGGESTIONS } from './finance.constants';
import { FinanceService } from './finance.service';

@ApiTags('finance')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'خلاصه‌ی مالیاتی: فروش، هزینه، سود خالص و ریز ماهانه/سالانه',
  })
  summary(@Query() query: FinanceSummaryQueryDto) {
    return this.finance.summary(query.from, query.to);
  }

  @Get('meta')
  @ApiOperation({ summary: 'دسته‌های پیشنهادی هزینه برای فرم پنل' })
  meta() {
    return { expenseCategories: EXPENSE_CATEGORY_SUGGESTIONS };
  }

  @Get('invoices/export')
  @ApiOperation({ summary: 'خروجی CSV فاکتورهای فروش برای ارائه به اداره مالیات' })
  async exportInvoices(
    @Query() query: ListFinanceDto,
    @Res() res: Response,
  ) {
    const csv = await this.finance.exportInvoicesCsv(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="invoices.csv"');
    res.send(csv);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'فهرست فاکتورهای فروش بایگانی‌شده' })
  listInvoices(@Query() query: ListFinanceDto) {
    return this.finance.listInvoices(query);
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'جزئیات یک فاکتور' })
  getInvoice(@Param('id') id: string) {
    return this.finance.getInvoice(id);
  }

  @Post('invoices/manual')
  @ApiOperation({ summary: 'ثبت دستی یک فروش و صدور فاکتور' })
  createManualInvoice(
    @CurrentUser() admin: AuthUser,
    @Body() dto: CreateManualInvoiceDto,
  ) {
    return this.finance.createManualInvoice(admin.id, dto);
  }

  @Post('invoices/:id/void')
  @ApiOperation({ summary: 'ابطال فاکتور (با حفظ سابقه برای حسابرسی)' })
  voidInvoice(
    @Param('id') id: string,
    @Body() dto: VoidInvoiceDto,
  ) {
    return this.finance.voidInvoice(id, dto.reason);
  }

  @Get('expenses/export')
  @ApiOperation({ summary: 'خروجی CSV هزینه‌های ثبت‌شده' })
  async exportExpenses(
    @Query() query: ListFinanceDto,
    @Res() res: Response,
  ) {
    const csv = await this.finance.exportExpensesCsv(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="expenses.csv"');
    res.send(csv);
  }

  @Get('expenses')
  @ApiOperation({ summary: 'فهرست هزینه‌های دستی (سرور، پیامک، ایمیل و …)' })
  listExpenses(@Query() query: ListFinanceDto) {
    return this.finance.listExpenses(query);
  }

  @Post('expenses')
  @ApiOperation({ summary: 'ثبت هزینه‌ی جدید توسط ادمین' })
  createExpense(
    @CurrentUser() admin: AuthUser,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.finance.createExpense(admin.id, dto);
  }

  @Patch('expenses/:id')
  @ApiOperation({ summary: 'ویرایش یک هزینه' })
  updateExpense(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.finance.updateExpense(admin.id, id, dto);
  }

  @Delete('expenses/:id')
  @ApiOperation({ summary: 'ابطال (حذف نرم) یک هزینه با حفظ سابقه' })
  voidExpense(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.finance.voidExpense(admin.id, id);
  }

  @Post('backfill')
  @ApiOperation({
    summary: 'ساخت فاکتور برای تراکنش‌های پرداخت‌شده‌ی قبلی که فاکتور ندارند',
  })
  backfill() {
    return this.finance.backfill();
  }
}
