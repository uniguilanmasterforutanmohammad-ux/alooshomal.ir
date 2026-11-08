import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  BnplOrderListQueryDto,
  ChangeBnplWalletCreditDto,
  CreateBnplOrderDto,
  ToggleBnplPlanDto,
} from './dto/bnpl.dto';
import { CouponDto } from './dto/coupon.dto';
import { CustomerDto, CustomerListQueryDto } from './dto/customer.dto';
import {
  CancelInvoiceDto,
  ConfirmInvoicePaymentDto,
  InvoiceDto,
  InvoiceListQueryDto,
} from './dto/invoice.dto';
import { ListFiltersDto } from './dto/list-filters.dto';
import {
  CreatePaymentDto,
  ReversePaymentDto,
  UnblockPaymentDto,
  VerifyPaymentDto,
  WithdrawRequestDto,
} from './dto/payment.dto';
import { PermalinkDto, ProductDto } from './dto/product.dto';
import { ReportFilterDto } from './dto/report.dto';
import { PaypingService } from './payping.service';

/**
 * Admin-only surface for the merchant's PayPing account. Every method forwards
 * to the PayPing REST API using the server-side `PAYPING_TOKEN`, so the token
 * never reaches the browser and every capability the token grants is available
 * from the dashboard.
 */
@ApiTags('payping')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/payping')
export class PaypingController {
  constructor(private readonly payping: PaypingService) {}

  // -------------------------------------------------------------------------
  //  Connection & overview
  // -------------------------------------------------------------------------

  @Get('status')
  @ApiOperation({ summary: 'وضعیت اتصال به درگاه پی‌پینگ' })
  status() {
    return this.payping.status();
  }

  @Get('overview')
  @ApiOperation({ summary: 'خلاصه‌ی شمارنده‌های حساب پی‌پینگ' })
  async overview() {
    const [transactions, withdrawals, customers, coupons, invoices] =
      await Promise.allSettled([
        this.payping.transactionReportCount({}),
        this.payping.withdrawTransactionsCount({}),
        this.payping.customersCount(),
        this.payping.couponsCount(),
        this.payping.invoicesCount(),
      ]);
    const value = (result: PromiseSettledResult<unknown>) =>
      result.status === 'fulfilled' ? result.value : null;
    return {
      transactions: value(transactions),
      withdrawals: value(withdrawals),
      customers: value(customers),
      coupons: value(coupons),
      invoices: value(invoices),
    };
  }

  // -------------------------------------------------------------------------
  //  Reports
  // -------------------------------------------------------------------------

  @Post('reports/transactions')
  @ApiOperation({ summary: 'گزارش تراکنش‌ها' })
  transactionReport(@Body() dto: ReportFilterDto) {
    return this.payping.transactionReport(dto);
  }

  @Post('reports/transactions/count')
  @ApiOperation({ summary: 'تعداد تراکنش‌ها' })
  transactionReportCount(@Body() dto: ReportFilterDto) {
    return this.payping.transactionReportCount(dto);
  }

  @Post('reports/withdrawals')
  @ApiOperation({ summary: 'لیست تسویه‌حساب‌ها' })
  withdrawTransactions(@Body() dto: ReportFilterDto) {
    return this.payping.withdrawTransactions(dto);
  }

  @Post('reports/withdrawals/count')
  @ApiOperation({ summary: 'تعداد تسویه‌حساب‌ها' })
  withdrawTransactionsCount(@Body() dto: ReportFilterDto) {
    return this.payping.withdrawTransactionsCount(dto);
  }

  @Get('reports/transaction/:code')
  @ApiOperation({ summary: 'جزئیات یک تراکنش و مغایرت‌گیری' })
  transactionDetail(@Param('code') code: string) {
    return this.payping.transactionDetail(code);
  }

  // -------------------------------------------------------------------------
  //  Withdraw
  // -------------------------------------------------------------------------

  @Post('withdrawals')
  @ApiOperation({ summary: 'درخواست تسویه‌حساب' })
  requestWithdraw(@Body() dto: WithdrawRequestDto) {
    return this.payping.requestWithdraw(dto.amount);
  }

  @Get('withdrawals/:code')
  @ApiOperation({ summary: 'جزئیات یک درخواست تسویه' })
  withdrawDetail(@Param('code') code: string) {
    return this.payping.withdrawDetail(code);
  }

  // -------------------------------------------------------------------------
  //  Customers
  // -------------------------------------------------------------------------

  @Get('customers/count')
  @ApiOperation({ summary: 'تعداد مشتریان' })
  customersCount() {
    return this.payping.customersCount();
  }

  @Get('customers')
  @ApiOperation({ summary: 'لیست مشتریان' })
  listCustomers(@Query() query: CustomerListQueryDto) {
    return this.payping.listCustomers(query);
  }

  @Get('customers/:code')
  @ApiOperation({ summary: 'مشخصات یک مشتری' })
  customer(@Param('code') code: string) {
    return this.payping.customer(code);
  }

  @Post('customers')
  @ApiOperation({ summary: 'ساخت مشتری جدید' })
  createCustomer(@Body() dto: CustomerDto) {
    return this.payping.createCustomer(dto);
  }

  @Put('customers/:code')
  @ApiOperation({ summary: 'به‌روزرسانی مشتری' })
  updateCustomer(@Param('code') code: string, @Body() dto: CustomerDto) {
    return this.payping.updateCustomer(code, dto);
  }

  @Delete('customers/:code')
  @ApiOperation({ summary: 'حذف مشتری' })
  deleteCustomer(@Param('code') code: string) {
    return this.payping.deleteCustomer(code);
  }

  // -------------------------------------------------------------------------
  //  Coupons
  // -------------------------------------------------------------------------

  @Get('coupons/count')
  @ApiOperation({ summary: 'تعداد کدهای تخفیف' })
  couponsCount() {
    return this.payping.couponsCount();
  }

  @Get('coupons')
  @ApiOperation({ summary: 'لیست کدهای تخفیف' })
  listCoupons(@Query() query: ListFiltersDto) {
    return this.payping.listCoupons(query);
  }

  @Get('coupons/:code')
  @ApiOperation({ summary: 'نمایش یک کد تخفیف' })
  coupon(@Param('code') code: string) {
    return this.payping.coupon(code);
  }

  @Post('coupons')
  @ApiOperation({ summary: 'ساخت کد تخفیف جدید' })
  createCoupon(@Body() dto: CouponDto) {
    return this.payping.createCoupon(dto);
  }

  @Put('coupons')
  @ApiOperation({ summary: 'به‌روزرسانی کد تخفیف' })
  updateCoupon(@Body() dto: CouponDto) {
    return this.payping.updateCoupon(dto);
  }

  @Delete('coupons/:code')
  @ApiOperation({ summary: 'حذف کد تخفیف' })
  deleteCoupon(@Param('code') code: string) {
    return this.payping.deleteCoupon(code);
  }

  @Get('coupons/:code/buyers')
  @ApiOperation({ summary: 'خریداران یک کد تخفیف' })
  couponBuyers(@Param('code') code: string, @Query() query: ListFiltersDto) {
    return this.payping.couponBuyers(code, query);
  }

  // -------------------------------------------------------------------------
  //  Products & permalinks
  // -------------------------------------------------------------------------

  @Get('products')
  @ApiOperation({ summary: 'لیست آیتم‌های مالی' })
  listProducts(@Query() query: ListFiltersDto) {
    return this.payping.listProducts(query);
  }

  @Get('products/:code')
  @ApiOperation({ summary: 'نمایش یک آیتم مالی' })
  product(@Param('code') code: string) {
    return this.payping.product(code);
  }

  @Post('products')
  @ApiOperation({ summary: 'ساخت آیتم مالی جدید' })
  createProduct(@Body() dto: ProductDto) {
    return this.payping.createProduct(dto);
  }

  @Put('products')
  @ApiOperation({ summary: 'به‌روزرسانی آیتم مالی' })
  updateProduct(@Body() dto: ProductDto) {
    return this.payping.updateProduct(dto);
  }

  @Delete('products/:code')
  @ApiOperation({ summary: 'حذف آیتم مالی' })
  deleteProduct(@Param('code') code: string) {
    return this.payping.deleteProduct(code);
  }

  @Post('permalinks')
  @ApiOperation({ summary: 'ساخت لینک ثابت برای آیتم مالی' })
  createPermalink(@Body() dto: PermalinkDto) {
    return this.payping.createPermalink(dto);
  }

  @Put('permalinks')
  @ApiOperation({ summary: 'ویرایش لینک ثابت' })
  updatePermalink(@Body() dto: PermalinkDto) {
    return this.payping.updatePermalink(dto);
  }

  @Get('permalinks/:code')
  @ApiOperation({ summary: 'دریافت اطلاعات لینک ثابت' })
  permalink(@Param('code') code: string) {
    return this.payping.permalink(code);
  }

  @Delete('permalinks/:code')
  @ApiOperation({ summary: 'حذف لینک ثابت' })
  deletePermalink(@Param('code') code: string) {
    return this.payping.deletePermalink(code);
  }

  @Get('permalinks/:code/buyers')
  @ApiOperation({ summary: 'خریداران یک لینک ثابت' })
  permalinkBuyers(
    @Param('code') code: string,
    @Query() query: ListFiltersDto,
  ) {
    return this.payping.permalinkBuyers(code, query);
  }

  // -------------------------------------------------------------------------
  //  Invoices
  // -------------------------------------------------------------------------

  @Get('invoices/count')
  @ApiOperation({ summary: 'تعداد فاکتورها' })
  invoicesCount() {
    return this.payping.invoicesCount();
  }

  @Get('invoices')
  @ApiOperation({ summary: 'لیست فاکتورها' })
  listInvoices(@Query() query: InvoiceListQueryDto) {
    return this.payping.listInvoices(query);
  }

  @Get('invoices/payment-code')
  @ApiOperation({ summary: 'دریافت کد پرداخت برای یک فاکتور' })
  invoicePaymentCode(@Query('code') code: string) {
    return this.payping.invoicePaymentCode({ Code: code });
  }

  @Get('invoices/:code')
  @ApiOperation({ summary: 'دریافت یک فاکتور' })
  invoice(@Param('code') code: string) {
    return this.payping.invoice(code);
  }

  @Post('invoices')
  @ApiOperation({ summary: 'ساخت فاکتور جدید' })
  createInvoice(@Body() dto: InvoiceDto) {
    return this.payping.createInvoice(dto);
  }

  @Put('invoices/:code')
  @ApiOperation({ summary: 'به‌روزرسانی فاکتور' })
  updateInvoice(@Param('code') code: string, @Body() dto: InvoiceDto) {
    return this.payping.updateInvoice(code, dto);
  }

  @Post('invoices/:code/archive')
  @ApiOperation({ summary: 'بایگانی فاکتور' })
  archiveInvoice(@Param('code') code: string) {
    return this.payping.archiveInvoice(code, true);
  }

  @Post('invoices/:code/dearchive')
  @ApiOperation({ summary: 'خروج فاکتور از بایگانی' })
  dearchiveInvoice(@Param('code') code: string) {
    return this.payping.archiveInvoice(code, false);
  }

  @Get('invoices/:code/pdf')
  @ApiOperation({ summary: 'دریافت PDF غیررسمی فاکتور' })
  invoicePdf(@Param('code') code: string) {
    return this.payping.invoicePdf(code);
  }

  @Post('invoices/cancel')
  @ApiOperation({ summary: 'درخواست لغو فاکتور' })
  cancelInvoice(@Body() dto: CancelInvoiceDto) {
    return this.payping.cancelInvoice(dto);
  }

  @Post('invoices/confirm-payment')
  @ApiOperation({ summary: 'تأیید پرداخت یک فاکتور' })
  confirmInvoicePayment(@Body() dto: ConfirmInvoicePaymentDto) {
    return this.payping.confirmInvoicePayment(dto);
  }

  // -------------------------------------------------------------------------
  //  Payments
  // -------------------------------------------------------------------------

  @Post('payments')
  @ApiOperation({ summary: 'ساخت پرداخت و دریافت لینک درگاه' })
  createPayment(@Body() dto: CreatePaymentDto) {
    return this.payping.createPayment(dto);
  }

  @Post('payments/verify')
  @ApiOperation({ summary: 'تأیید نهایی پرداخت' })
  verifyPayment(@Body() dto: VerifyPaymentDto) {
    return this.payping.verifyPayment(dto);
  }

  @Post('payments/reverse')
  @ApiOperation({ summary: 'بازگشت وجه پرداخت (ریفاند)' })
  reversePayment(@Body() dto: ReversePaymentDto) {
    return this.payping.reversePayment(dto);
  }

  @Post('payments/unblock')
  @ApiOperation({ summary: 'آزادسازی پرداخت مسدودشده' })
  unblockPayment(@Body() dto: UnblockPaymentDto) {
    return this.payping.unblockPayment(dto);
  }

  @Delete('payments/:code')
  @ApiOperation({ summary: 'حذف پرداخت unpaid' })
  deletePayment(@Param('code') code: string) {
    return this.payping.deletePayment(code);
  }

  // -------------------------------------------------------------------------
  //  BNPL
  // -------------------------------------------------------------------------

  @Get('bnpl/options')
  @ApiOperation({ summary: 'گزینه‌های خرید اقساطی (BNPL)' })
  bnplOptions() {
    return this.payping.bnplOptions();
  }

  @Get('bnpl/orders')
  @ApiOperation({ summary: 'لیست سفارش‌های اقساطی' })
  bnplOrders(@Query() query: BnplOrderListQueryDto) {
    return this.payping.bnplOrders(query);
  }

  @Get('bnpl/orders/detail')
  @ApiOperation({ summary: 'جزئیات سفارش اقساطی' })
  bnplOrderDetail(@Query('trackingCode') trackingCode: string) {
    return this.payping.bnplOrderDetail({ trackingCode });
  }

  @Post('bnpl/orders')
  @ApiOperation({ summary: 'ساخت سفارش اقساطی' })
  createBnplOrder(@Body() dto: CreateBnplOrderDto) {
    return this.payping.createBnplOrder(dto);
  }

  @Get('bnpl/plans')
  @ApiOperation({ summary: 'لیست طرح‌های اقساطی' })
  bnplPlans() {
    return this.payping.bnplPlans();
  }

  @Put('bnpl/plans/toggle')
  @ApiOperation({ summary: 'فعال/غیرفعال‌کردن طرح اقساطی' })
  toggleBnplPlan(@Body() dto: ToggleBnplPlanDto) {
    return this.payping.toggleBnplPlan(dto);
  }

  @Post('bnpl/wallet-credit')
  @ApiOperation({ summary: 'تغییر اعتبار کیف پول اقساطی' })
  changeBnplWalletCredit(@Body() dto: ChangeBnplWalletCreditDto) {
    return this.payping.changeBnplWalletCredit(dto);
  }

  // -------------------------------------------------------------------------
  //  Inquiries
  // -------------------------------------------------------------------------

  @Get('inquiries/card-to-sheba')
  @ApiOperation({ summary: 'تبدیل کارت به شبا' })
  cardToSheba(@Query('cardNumber') cardNumber: string) {
    return this.payping.inquiry(
      '/v1/inquiry/Cards/card-to-sheba-inquiry',
      { cardNumber },
    );
  }

  @Get('inquiries/card-to-deposit')
  @ApiOperation({ summary: 'تبدیل کارت به حساب' })
  cardToDeposit(@Query('cardNumber') cardNumber: string) {
    return this.payping.inquiry(
      '/v1/inquiry/Cards/card-to-deposit-inquiry',
      { cardNumber },
    );
  }

  @Get('inquiries/card-to-owner')
  @ApiOperation({ summary: 'استعلام کارت' })
  cardToOwner(@Query('cardNumber') cardNumber: string) {
    return this.payping.inquiry(
      '/v1/inquiry/Cards/card-to-owner-info-inquiry',
      { cardNumber },
    );
  }

  @Get('inquiries/sheba-owner')
  @ApiOperation({ summary: 'استعلام شبا' })
  shebaOwner(@Query('sheba') sheba: string) {
    return this.payping.inquiry('/v1/inquiry/Sheba/sheba-owner-info', {
      sheba,
    });
  }

  @Get('inquiries/postal-code')
  @ApiOperation({ summary: 'استعلام کدپستی' })
  postalCode(@Query('postalCode') postalCode: string) {
    return this.payping.inquiry(
      '/v1/inquiry/PostalCode/inquiry-postal-code',
      { postalCode },
    );
  }

  @Get('inquiries/national-code')
  @ApiOperation({ summary: 'استعلام اطلاعات هویتی با کدملی' })
  nationalCode(
    @Query('nationalCode') nationalCode: string,
    @Query('birthDate') birthDate: string,
  ) {
    return this.payping.inquiry(
      '/v1/inquiry/NationalCode/inquiry-with-personal-info',
      { nationalCode, birthDate },
    );
  }

  @Get('inquiries/national-code-mobile')
  @ApiOperation({ summary: 'تطابق کد ملی و شماره موبایل' })
  nationalCodeMobile(
    @Query('nationalCode') nationalCode: string,
    @Query('mobile') mobile: string,
  ) {
    return this.payping.inquiry(
      '/v1/inquiry/Matching/nationalcode-with-mobile',
      { nationalCode, mobile },
    );
  }

  // -------------------------------------------------------------------------
  //  Upload
  // -------------------------------------------------------------------------

  @Post('uploads/:kind')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'آپلود فایل روی پی‌پینگ (پروفایل/آیتم/ضمیمه)' })
  upload(
    @Param('kind') kind: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const allowed = ['ProfilePic', 'Item', 'InvoiceAttachment'] as const;
    const resolved = allowed.includes(kind as (typeof allowed)[number])
      ? (kind as (typeof allowed)[number])
      : 'ProfilePic';
    return this.payping.upload(resolved, file);
  }
}
