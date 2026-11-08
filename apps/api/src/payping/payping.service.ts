import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface RequestOptions {
  query?: object;
  body?: unknown;
}

/** Public description of the merchant connection, shown in the admin panel. */
export interface PaypingStatus {
  configured: boolean;
  reachable: boolean;
  baseUrl: string;
  latencyMs: number | null;
  message: string | null;
}

/** How long a single PayPing call may take before it is abandoned. */
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Thin NestJS client for the PayPing merchant REST API
 * (`https://api.payping.ir`, documented at https://docs.payping.ir/).
 *
 * The merchant access token is read from `PAYPING_TOKEN`; it is never exposed
 * to the browser and never hardcoded (the panel talks to this API instead).
 * Every method mirrors one documented PayPing endpoint and simply forwards the
 * parameters, so the admin panel can surface the same capabilities the token
 * grants.
 */
@Injectable()
export class PaypingService {
  private readonly logger = new Logger(PaypingService.name);
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(config: ConfigService) {
    this.baseUrl = (
      config.get<string>('PAYPING_BASE_URL') ?? 'https://api.payping.ir'
    ).replace(/\/+$/, '');
    this.token = (config.get<string>('PAYPING_TOKEN') ?? '').trim();
  }

  /** Whether a merchant token is available at all. */
  get configured(): boolean {
    return this.token.length > 0;
  }

  // -------------------------------------------------------------------------
  //  Transport
  // -------------------------------------------------------------------------

  private async request<T = unknown>(
    method: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    if (!this.token) {
      throw new ServiceUnavailableException(
        'توکن درگاه پرداخت پی‌پینگ تنظیم نشده است. مقدار PAYPING_TOKEN را در محیط سرور قرار دهید.',
      );
    }

    const url = new URL(`${this.baseUrl}${path}`);
    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value === undefined || value === null || value === '') continue;
        url.searchParams.set(key, String(value));
      }
    }

    const hasBody = options.body !== undefined;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/json',
          ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        },
        body: hasBody ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`PayPing ${method} ${path} unreachable: ${reason}`);
      throw new BadGatewayException(
        'ارتباط با درگاه پرداخت پی‌پینگ برقرار نشد. لطفاً اتصال شبکه را بررسی کنید.',
      );
    } finally {
      clearTimeout(timeout);
    }

    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text) as unknown;
      } catch {
        payload = text;
      }
    }

    if (!response.ok) {
      const message = this.describeError(payload, response.status);
      const traceId = this.describeTraceId(payload);
      this.logger.warn(
        `PayPing ${method} ${path} -> ${response.status}: ${message}${
          traceId ? ` (trace ${traceId})` : ''
        }`,
      );
      const Exception =
        response.status >= 500 ? BadGatewayException : BadRequestException;
      const exception = new Exception(message) as HttpException & {
        paypingStatus?: number;
      };
      // Keep the upstream status (409 = already verified, 429 = rate limited,
      // …) so callers can react instead of only seeing a generic 400.
      exception.paypingStatus = response.status;
      throw exception;
    }

    return payload as T;
  }

  /** Turns PayPing's problem+json / validation bodies into one Persian line. */
  private describeError(payload: unknown, status: number): string {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const record = payload as Record<string, unknown>;
      // PayPing wraps policy/validation failures in
      // `metaData: { code, errors: [{ message }] }`; that nested message is the
      // only human-readable part (type/title/instance are generic).
      const metaData =
        record.metaData && typeof record.metaData === 'object'
          ? (record.metaData as Record<string, unknown>)
          : null;
      const errors = Array.isArray(metaData?.errors) ? metaData.errors : [];
      const errorMessages = errors
        .map((item) =>
          item && typeof item === 'object'
            ? (item as Record<string, unknown>).message
            : item,
        )
        .filter(
          (value): value is string =>
            typeof value === 'string' && value.trim() !== '',
        );
      if (errorMessages.length) {
        const code =
          typeof metaData?.code === 'number' || typeof metaData?.code === 'string'
            ? String(metaData.code)
            : null;
        const suffix = code ? ` (کد ${code})` : '';
        return `${errorMessages.join('، ')}${suffix}`;
      }
      if (typeof record.detail === 'string' && record.detail.trim()) {
        return record.detail.trim();
      }
      if (typeof record.message === 'string' && record.message.trim()) {
        return record.message.trim();
      }
    }
    if (typeof payload === 'string' && payload.trim()) {
      return payload.trim().slice(0, 300);
    }
    return `خطا در درگاه پی‌پینگ (کد ${status})`;
  }

  /** PayPing trace id (used by their support) when the body carries one. */
  private describeTraceId(payload: unknown): string | null {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const traceId = (payload as Record<string, unknown>).paypingTraceId;
      if (typeof traceId === 'string' && traceId.trim()) return traceId.trim();
    }
    return null;
  }

  // -------------------------------------------------------------------------
  //  Connection
  // -------------------------------------------------------------------------

  /** Verifies the token/connection by calling a cheap read endpoint. */
  async status(): Promise<PaypingStatus> {
    if (!this.configured) {
      return {
        configured: false,
        reachable: false,
        baseUrl: this.baseUrl,
        latencyMs: null,
        message:
          'توکن پی‌پینگ روی سرور تنظیم نشده است (متغیر محیطی PAYPING_TOKEN).',
      };
    }
    const startedAt = Date.now();
    try {
      await this.request('POST', '/v1/report/TransactionReportCount', {
        body: {},
      });
      return {
        configured: true,
        reachable: true,
        baseUrl: this.baseUrl,
        latencyMs: Date.now() - startedAt,
        message: null,
      };
    } catch (error) {
      return {
        configured: true,
        reachable: false,
        baseUrl: this.baseUrl,
        latencyMs: null,
        message: error instanceof Error ? error.message : 'خطای نامشخص',
      };
    }
  }

  // -------------------------------------------------------------------------
  //  Reports (گزارش‌ها)
  // -------------------------------------------------------------------------

  transactionReport(dto: unknown) {
    return this.request('POST', '/v1/report/TransactionReport', { body: dto });
  }

  transactionReportCount(dto: unknown) {
    return this.request('POST', '/v1/report/TransactionReportCount', {
      body: dto,
    });
  }

  withdrawTransactions(dto: unknown) {
    return this.request('POST', '/v1/report/WithdrawTransactions', {
      body: dto,
    });
  }

  withdrawTransactionsCount(dto: unknown) {
    return this.request('POST', '/v1/report/WithdrawTransactionsCount', {
      body: dto,
    });
  }

  transactionDetail(code: string) {
    return this.request('GET', `/v1/report/${encodeURIComponent(code)}`);
  }

  // -------------------------------------------------------------------------
  //  Withdraw (تسویه حساب)
  // -------------------------------------------------------------------------

  requestWithdraw(amount: number) {
    return this.request('POST', `/v1/withdraw/${Math.trunc(amount)}`);
  }

  withdrawDetail(code: string) {
    return this.request('GET', `/v1/withdraw/${encodeURIComponent(code)}`);
  }

  // -------------------------------------------------------------------------
  //  Customers (مشتریان)
  // -------------------------------------------------------------------------

  listCustomers(query: object) {
    return this.request('GET', '/v1/customer/List', { query });
  }

  customersCount() {
    return this.request('GET', '/v1/customer/ListCount');
  }

  customer(code: string) {
    return this.request('GET', `/v1/customer/${encodeURIComponent(code)}`);
  }

  createCustomer(dto: unknown) {
    return this.request('POST', '/v1/customer', { body: dto });
  }

  updateCustomer(code: string, dto: unknown) {
    return this.request('PUT', `/v1/customer/${encodeURIComponent(code)}`, {
      body: dto,
    });
  }

  deleteCustomer(code: string) {
    return this.request('DELETE', `/v1/customer/${encodeURIComponent(code)}`);
  }

  // -------------------------------------------------------------------------
  //  Coupons (کدهای تخفیف)
  // -------------------------------------------------------------------------

  listCoupons(query: object) {
    return this.request('GET', '/v1/coupon/List', { query });
  }

  couponsCount() {
    return this.request('GET', '/v1/coupon/ListCount');
  }

  coupon(code: string) {
    return this.request('GET', `/v1/coupon/${encodeURIComponent(code)}`);
  }

  createCoupon(dto: unknown) {
    return this.request('POST', '/v1/coupon', { body: dto });
  }

  updateCoupon(dto: unknown) {
    return this.request('PUT', '/v1/coupon', { body: dto });
  }

  deleteCoupon(code: string) {
    return this.request('DELETE', `/v1/coupon/${encodeURIComponent(code)}`);
  }

  couponBuyers(code: string, query: object) {
    return this.request(
      'GET',
      `/v1/coupon/${encodeURIComponent(code)}/BuyersList`,
      { query },
    );
  }

  couponBuyersCount(code: string) {
    return this.request(
      'GET',
      `/v1/coupon/${encodeURIComponent(code)}/BuyersListCount`,
    );
  }

  // -------------------------------------------------------------------------
  //  Products & permalinks (آیتم‌های مالی)
  // -------------------------------------------------------------------------

  listProducts(query: object) {
    return this.request('GET', '/v1/product/List', { query });
  }

  product(code: string) {
    return this.request('GET', `/v1/product/${encodeURIComponent(code)}`);
  }

  createProduct(dto: unknown) {
    return this.request('POST', '/v1/product', { body: dto });
  }

  updateProduct(dto: unknown) {
    return this.request('PUT', '/v1/product', { body: dto });
  }

  deleteProduct(code: string) {
    return this.request('DELETE', `/v1/product/${encodeURIComponent(code)}`);
  }

  createPermalink(dto: unknown) {
    return this.request('POST', '/v1/permalink', { body: dto });
  }

  updatePermalink(dto: unknown) {
    return this.request('PUT', '/v1/permalink', { body: dto });
  }

  permalink(code: string) {
    return this.request('GET', `/v1/permalink/${encodeURIComponent(code)}`);
  }

  deletePermalink(code: string) {
    return this.request('DELETE', `/v1/permalink/${encodeURIComponent(code)}`);
  }

  permalinkBuyers(productCode: string, query: object) {
    return this.request(
      'GET',
      `/v1/permalink/${encodeURIComponent(productCode)}/BuyersList`,
      { query },
    );
  }

  // -------------------------------------------------------------------------
  //  Invoices (فاکتورها)
  // -------------------------------------------------------------------------

  listInvoices(query: object) {
    return this.request('GET', '/v2/invoice/List', { query });
  }

  invoicesCount() {
    return this.request('GET', '/v2/invoice/ListCount');
  }

  invoice(code: string) {
    return this.request('GET', `/v2/invoice/${encodeURIComponent(code)}`);
  }

  createInvoice(dto: unknown) {
    return this.request('POST', '/v2/invoice', { body: dto });
  }

  updateInvoice(code: string, dto: unknown) {
    return this.request('PUT', `/v2/invoice/${encodeURIComponent(code)}`, {
      body: dto,
    });
  }

  archiveInvoice(code: string, archive: boolean) {
    const action = archive ? 'Archive' : 'DeArchive';
    return this.request(
      'POST',
      `/v2/invoice/${action}/${encodeURIComponent(code)}`,
    );
  }

  invoicePdf(code: string) {
    return this.request('GET', `/v2/invoice/Pdf/${encodeURIComponent(code)}`);
  }

  cancelInvoice(dto: unknown) {
    return this.request('POST', '/v2/invoice/Cancel', { body: dto });
  }

  invoicePaymentCode(query: object) {
    return this.request('GET', '/v2/invoice/PaymentCode', { query });
  }

  confirmInvoicePayment(dto: unknown) {
    return this.request('POST', '/v2/invoice/ConfirmPayment', { body: dto });
  }

  // -------------------------------------------------------------------------
  //  Payments (پرداخت)
  // -------------------------------------------------------------------------

  createPayment(dto: unknown) {
    return this.request('POST', '/v3/pay', { body: dto });
  }

  verifyPayment(dto: unknown) {
    return this.request('POST', '/v3/pay/verify', { body: dto });
  }

  reversePayment(dto: unknown) {
    return this.request('POST', '/v3/pay/reverse', { body: dto });
  }

  unblockPayment(dto: unknown) {
    return this.request('POST', '/v3/pay/unblock', { body: dto });
  }

  deletePayment(paymentCode: string) {
    return this.request('DELETE', '/v3/pay', { body: { paymentCode } });
  }

  // -------------------------------------------------------------------------
  //  BNPL (خرید اقساطی)
  // -------------------------------------------------------------------------

  bnplOptions() {
    return this.request('GET', '/v1/bnpl/merchant/options/get');
  }

  bnplOrders(query: object) {
    return this.request('GET', '/v1/bnpl/merchant/order/list', { query });
  }

  bnplOrderDetail(query: object) {
    return this.request('GET', '/v1/bnpl/merchant/order/detail', { query });
  }

  createBnplOrder(dto: unknown) {
    return this.request('POST', '/v1/bnpl/merchant/order/create', {
      body: dto,
    });
  }

  bnplPlans() {
    return this.request('GET', '/v1/bnpl/merchant/plan/list');
  }

  toggleBnplPlan(dto: unknown) {
    return this.request('PUT', '/v1/bnpl/merchant/plan/toggle-active', {
      body: dto,
    });
  }

  changeBnplWalletCredit(dto: unknown) {
    return this.request(
      'POST',
      '/v1/bnpl/merchant/contract/change-wallet-credit-amount',
      { body: dto },
    );
  }

  // -------------------------------------------------------------------------
  //  Inquiry (استعلام‌ها)
  // -------------------------------------------------------------------------

  inquiry(path: string, query: object) {
    return this.request('GET', path, { query });
  }

  // -------------------------------------------------------------------------
  //  Upload (آپلود فایل)
  // -------------------------------------------------------------------------

  /** Forwards a multipart file to one of the PayPing upload endpoints. */
  async upload(
    kind: 'ProfilePic' | 'Item' | 'InvoiceAttachment',
    file: { buffer: Buffer; originalname: string; mimetype: string },
  ): Promise<unknown> {
    if (!this.token) {
      throw new ServiceUnavailableException(
        'توکن درگاه پرداخت پی‌پینگ تنظیم نشده است.',
      );
    }
    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
      file.originalname,
    );
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${this.baseUrl}/v1/upload/${kind}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/json',
        },
        body: form,
        signal: controller.signal,
      });
      const text = await response.text();
      let payload: unknown = null;
      if (text) {
        try {
          payload = JSON.parse(text) as unknown;
        } catch {
          payload = text;
        }
      }
      if (!response.ok) {
        const Exception =
          response.status >= 500 ? BadGatewayException : BadRequestException;
        throw new Exception(this.describeError(payload, response.status));
      }
      return payload;
    } finally {
      clearTimeout(timeout);
    }
  }
}
