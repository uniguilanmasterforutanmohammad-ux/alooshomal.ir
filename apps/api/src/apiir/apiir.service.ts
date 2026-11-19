import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ActivityService } from '../activity/activity.service';
import { PaypingService } from '../payping/payping.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  APIIR_PRICE_SETTING_PREFIX,
  APIIR_SERVICES,
  APIIR_SERVICE_SETTING_PREFIX,
} from './apiir.constants';
import type { ApiIrCallResult, ApiIrServiceDef } from './apiir.types';

/** How long one api.ir call may take before it is abandoned. */
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Setting key prefix that stores the PayPing product mirrored for one api.ir
 * service (JSON `{ code, amount }`). Kept outside the generated catalogue so
 * `sync_apiir_catalog.py` never overwrites it.
 */
const APIIR_PAYPING_PRODUCT_PREFIX = 'apiir.payping.';

/** Admin-facing description of the api.ir connection. */
export interface ApiIrStatus {
  configured: boolean;
  /** Local simulator: calls return fake data and never cost api.ir credit. */
  simulated: boolean;
  baseUrl: string;
  enabledCount: number;
  total: number;
}

/**
 * Thin client for the api.ir web services (`https://s.api.ir`), documented at
 * https://s.api.ir/scalar/v1.
 *
 * The bearer key is read from the `API_KEY_API.IR` environment variable (the
 * `APIIR_TOKEN` alias is also accepted) and never leaves the server. Each
 * service is individually switchable through an `apiir.service.<key>` setting
 * so the admin can roll capabilities out one at a time. Calls are normalised
 * into {@link ApiIrCallResult} instead of throwing on business errors, so the
 * panel can show api.ir's own Persian message.
 *
 * NOTE: a real call is billed to the api.ir account credit, so the admin
 * «آزمایش» button is explicit and labelled as a paid call.
 */
@Injectable()
export class ApiIrService {
  private readonly logger = new Logger(ApiIrService.name);
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly simulated: boolean;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly payping: PaypingService,
  ) {
    this.baseUrl = (
      config.get<string>('APIIR_BASE_URL') ?? 'https://s.api.ir'
    ).replace(/\/+$/, '');
    // The dotted name cannot be reached through `ConfigService.get` (dot is a
    // path separator there), so read it straight from the environment.
    const raw =
      process.env['API_KEY_API.IR'] ??
      config.get<string>('APIIR_TOKEN') ??
      process.env['APIIR_TOKEN'] ??
      '';
    this.token = raw.trim();

    const nodeEnv = (
      config.get<string>('NODE_ENV') ?? 'development'
    ).toLowerCase();
    const appUrl =
      config.get<string>('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000';
    const flag = (config.get<string>('APIIR_SIMULATOR') ?? '')
      .trim()
      .toLowerCase();
    this.simulated =
      flag === 'true' ||
      (flag !== 'false' && nodeEnv !== 'production' && isLoopback(appUrl));
    if (this.simulated) {
      this.logger.warn(
        'api.ir simulator is ENABLED — inquiries return fake data and cost nothing.',
      );
    }
  }

  get configured(): boolean {
    return this.token.length > 0;
  }

  get publicBaseUrl(): string {
    return this.baseUrl;
  }

  get isSimulated(): boolean {
    return this.simulated;
  }

  private settingKey(key: string) {
    return `${APIIR_SERVICE_SETTING_PREFIX}${key}`;
  }

  private priceKey(key: string) {
    return `${APIIR_PRICE_SETTING_PREFIX}${key}`;
  }

  private paypingProductKey(key: string) {
    return `${APIIR_PAYPING_PRODUCT_PREFIX}${key}`;
  }

  private findService(key: string): ApiIrServiceDef {
    const service = APIIR_SERVICES.find((entry) => entry.key === key);
    if (!service) throw new NotFoundException('سرویس api.ir یافت نشد');
    return service;
  }

  /** Per-service enabled map, defaulting to off until the admin switches it on. */
  async getEnabledMap(): Promise<Record<string, boolean>> {
    const rows = await this.prisma.setting.findMany({
      where: { key: { startsWith: APIIR_SERVICE_SETTING_PREFIX } },
    });
    const byKey = new Map(rows.map((row) => [row.key, row.value]));
    const map: Record<string, boolean> = {};
    for (const service of APIIR_SERVICES) {
      const row = byKey.get(this.settingKey(service.key));
      map[service.key] = row ? row !== 'false' : false;
    }
    return map;
  }

  async isServiceEnabled(key: string): Promise<boolean> {
    this.findService(key);
    const row = await this.prisma.setting.findUnique({
      where: { key: this.settingKey(key) },
    });
    return row ? row.value !== 'false' : false;
  }

  /** Throw a 403 when a service is switched off (server-side enforcement). */
  async assertServiceEnabled(key: string): Promise<void> {
    if (!(await this.isServiceEnabled(key))) {
      const service = this.findService(key);
      throw new ForbiddenException(
        `سرویس «${service.label}» در پنل مدیریت غیرفعال است.`,
      );
    }
  }

  async setServiceEnabled(
    key: string,
    enabled: boolean,
    actorId?: string,
  ): Promise<{ key: string; enabled: boolean }> {
    const service = this.findService(key);
    await this.prisma.setting.upsert({
      where: { key: this.settingKey(key) },
      create: { key: this.settingKey(key), value: enabled ? 'true' : 'false' },
      update: { value: enabled ? 'true' : 'false' },
    });
    await this.activity.log({
      actor: actorId ? { id: actorId } : null,
      action: 'APIIR_SERVICE_TOGGLED',
      summary: `${enabled ? 'فعال‌سازی' : 'غیرفعال‌سازی'} سرویس api.ir «${service.label}»`,
      entityType: 'SETTING',
      entityId: this.settingKey(key),
    });
    return { key, enabled };
  }

  /** Per-service prices (Toman); the tariff users will pay once sold. */
  async getPriceMap(): Promise<Record<string, number>> {
    const rows = await this.prisma.setting.findMany({
      where: { key: { startsWith: APIIR_PRICE_SETTING_PREFIX } },
    });
    const byKey = new Map(rows.map((row) => [row.key, row.value]));
    const map: Record<string, number> = {};
    for (const service of APIIR_SERVICES) {
      const parsed = Number(byKey.get(this.priceKey(service.key)) ?? 0);
      map[service.key] =
        Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
    }
    return map;
  }

  async getServicePrice(key: string): Promise<number> {
    this.findService(key);
    const row = await this.prisma.setting.findUnique({
      where: { key: this.priceKey(key) },
    });
    const parsed = Number(row?.value ?? 0);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  }

  async setServicePrice(
    key: string,
    price: number,
    actorId?: string,
  ): Promise<{ key: string; price: number }> {
    const service = this.findService(key);
    const clean = Math.min(1_000_000_000, Math.max(0, Math.floor(price)));
    await this.prisma.setting.upsert({
      where: { key: this.priceKey(key) },
      create: { key: this.priceKey(key), value: String(clean) },
      update: { value: String(clean) },
    });
    await this.activity.log({
      actor: actorId ? { id: actorId } : null,
      action: 'APIIR_SERVICE_PRICED',
      summary: `تعیین هزینه ${clean.toLocaleString('fa-IR')} تومانی برای سرویس api.ir «${service.label}»`,
      entityType: 'SETTING',
      entityId: this.priceKey(key),
    });
    return { key, price: clean };
  }

  /** Update the switch and/or price of one service in a single admin action. */
  async updateService(
    key: string,
    dto: { enabled?: boolean; price?: number },
    actorId?: string,
  ): Promise<{ key: string; enabled: boolean; price: number }> {
    if (dto.enabled !== undefined) {
      await this.setServiceEnabled(key, dto.enabled, actorId);
    }
    if (dto.price !== undefined) {
      await this.setServicePrice(key, dto.price, actorId);
    }
    return {
      key,
      enabled: await this.isServiceEnabled(key),
      price: await this.getServicePrice(key),
    };
  }

  /** Parse a stored product row, tolerating the legacy plain-code format. */
  private parsePaypingProduct(
    value: string | undefined,
  ): { code: string; amount: number | null } | null {
    const raw = value?.trim();
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { code?: unknown; amount?: unknown };
      if (typeof parsed?.code === 'string' && parsed.code.trim()) {
        return {
          code: parsed.code.trim(),
          amount:
            typeof parsed.amount === 'number' && Number.isFinite(parsed.amount)
              ? parsed.amount
              : null,
        };
      }
    } catch {
      // Not JSON: fall through to the legacy plain-code format.
    }
    return { code: raw, amount: null };
  }

  /** PayPing product mirrored for every api.ir service (keyed by service). */
  async getPaypingProductMap(): Promise<
    Record<string, { code: string; amount: number | null }>
  > {
    const rows = await this.prisma.setting.findMany({
      where: { key: { startsWith: APIIR_PAYPING_PRODUCT_PREFIX } },
    });
    const byKey = new Map(rows.map((row) => [row.key, row.value]));
    const map: Record<string, { code: string; amount: number | null }> = {};
    for (const service of APIIR_SERVICES) {
      const parsed = this.parsePaypingProduct(
        byKey.get(this.paypingProductKey(service.key)),
      );
      if (parsed) map[service.key] = parsed;
    }
    return map;
  }

  /**
   * Mirror one priced api.ir service into a PayPing «آیتم مالی». The product
   * amount always follows the admin-set user price; a cached code is updated
   * in place, and a 4xx (product deleted in the PayPing console) recreates it.
   */
  async syncPaypingProduct(
    key: string,
    actorId?: string,
  ): Promise<{
    key: string;
    code: string;
    amount: number;
    title: string;
    updated: boolean;
  }> {
    const service = this.findService(key);
    const price = await this.getServicePrice(key);
    if (price <= 0) {
      throw new BadRequestException(
        'ابتدا هزینه‌ی این سرویس را ثبت کنید؛ محصول بدون مبلغ ساخته نمی‌شود.',
      );
    }
    if (price < 1000) {
      throw new BadRequestException(
        'حداقل مبلغ محصول در درگاه پی‌پینگ ۱٬۰۰۰ تومان است.',
      );
    }
    const payload = {
      title: `استعلام ${service.label} — api.ir — شمالی‌کارت`,
      description: `${service.description} (${service.group})`.slice(0, 300),
      amount: price,
      defineAmountByUser: false,
      haveTax: false,
      unlimited: true,
    };

    const stored = this.parsePaypingProduct(
      (
        await this.prisma.setting.findUnique({
          where: { key: this.paypingProductKey(key) },
        })
      )?.value,
    );
    let code: string | null = null;
    let updated = false;
    if (stored?.code) {
      try {
        await this.payping.updateProduct({ ...payload, code: stored.code });
        code = stored.code;
        updated = true;
      } catch (error) {
        const status = (error as { paypingStatus?: number } | null)
          ?.paypingStatus;
        // A 4xx means the cached product is gone (deleted in the PayPing
        // console or wiped by the cleanup action): recreate it below.
        if (!(typeof status === 'number' && status >= 400 && status < 500)) {
          throw error;
        }
      }
    }
    if (!code) {
      const created = (await this.payping.createProduct(payload)) as {
        code?: string;
      } | null;
      if (!created?.code) {
        throw new BadGatewayException(
          'ساخت محصول در پی‌پینگ ناموفق بود؛ لطفاً دوباره تلاش کنید.',
        );
      }
      code = created.code;
    }

    await this.prisma.setting.upsert({
      where: { key: this.paypingProductKey(key) },
      create: {
        key: this.paypingProductKey(key),
        value: JSON.stringify({ code, amount: price }),
      },
      update: { value: JSON.stringify({ code, amount: price }) },
    });
    await this.activity.log({
      actor: actorId ? { id: actorId } : null,
      action: 'APIIR_PAYPING_PRODUCT_SYNCED',
      summary: `${updated ? 'به‌روزرسانی' : 'ساخت'} محصول پی‌پینگ «${service.label}» با مبلغ ${price.toLocaleString('fa-IR')} تومان`,
      entityType: 'SETTING',
      entityId: this.paypingProductKey(key),
    });
    return { key, code, amount: price, title: payload.title, updated };
  }

  /** Connection status + every service with its current switch/price. */
  async listServices(): Promise<{
    status: ApiIrStatus;
    services: Array<
      ApiIrServiceDef & {
        enabled: boolean;
        price: number;
        payping: { code: string; amount: number | null } | null;
      }
    >;
  }> {
    const [enabled, prices, paypingProducts] = await Promise.all([
      this.getEnabledMap(),
      this.getPriceMap(),
      this.getPaypingProductMap(),
    ]);
    const services = APIIR_SERVICES.map((service) => ({
      ...service,
      enabled: enabled[service.key],
      price: prices[service.key] ?? 0,
      payping: paypingProducts[service.key] ?? null,
    }));
    return {
      status: {
        configured: this.configured,
        simulated: this.simulated,
        baseUrl: this.baseUrl,
        enabledCount: services.filter((service) => service.enabled).length,
        total: services.length,
      },
      services,
    };
  }

  // -------------------------------------------------------------------------
  //  Transport
  // -------------------------------------------------------------------------

  /**
   * Call one api.ir service. `force` lets the admin «آزمایش» button run a
   * disabled service without first switching it on.
   */
  async call<T = Record<string, unknown>>(
    key: string,
    payload: Record<string, unknown> = {},
    options: { force?: boolean } = {},
  ): Promise<ApiIrCallResult<T>> {
    const service = this.findService(key);
    if (this.simulated) {
      return this.simulatedResult<T>(service, payload);
    }
    if (!this.configured) {
      throw new ServiceUnavailableException(
        'کلید api.ir تنظیم نشده است. مقدار API_KEY_API.IR را در محیط سرور قرار دهید.',
      );
    }
    if (!options.force && !(await this.isServiceEnabled(key))) {
      throw new ForbiddenException(
        `سرویس «${service.label}» در پنل مدیریت غیرفعال است.`,
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const startedAt = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}${service.path}`, {
        method: service.method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: service.method === 'GET' ? undefined : JSON.stringify(payload),
        signal: controller.signal,
      });
      const latencyMs = Date.now() - startedAt;
      const text = await response.text();
      let parsed: unknown = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = text;
      }
      return this.normalise<T>(parsed, response.status, latencyMs);
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const aborted = error instanceof Error && error.name === 'AbortError';
      this.logger.warn(
        `api.ir ${key} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        ok: false,
        code: null,
        message: aborted
          ? 'پاسخ api.ir در زمان مجاز دریافت نشد.'
          : 'ارتباط با سرویس api.ir برقرار نشد.',
        data: null,
        httpStatus: null,
        latencyMs,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Local stand-in for api.ir: returns a plausible, success-shaped payload
   * built from the submitted fields. It never touches the network, so a
   * development run cannot spend the api.ir account credit.
   */
  private simulatedResult<T>(
    service: ApiIrServiceDef,
    payload: Record<string, unknown>,
  ): ApiIrCallResult<T> {
    const data = this.simulatedData(service.key, payload);
    return {
      ok: true,
      code: 0,
      message: 'پاسخ شبیه‌سازی‌شده (محیط لوکال) — بدون فراخوانی واقعی و بدون هزینه',
      data: data as T,
      httpStatus: 200,
      latencyMs: 18,
      simulated: true,
    };
  }

  private simulatedData(
    key: string,
    payload: Record<string, unknown>,
  ): Record<string, unknown> {
    const now = new Date();
    const nationalCode =
      typeof payload.nationalCode === 'string' && payload.nationalCode
        ? payload.nationalCode
        : '0013529536';
    const mobile =
      typeof payload.mobile === 'string' && payload.mobile
        ? payload.mobile
        : '09120000000';
    const base = {
      simulated: true,
      reference: `SIM-${now.getTime().toString(36).toUpperCase()}`,
      checkedAt: now.toISOString(),
    };
    if (key === 'license') {
      return {
        ...base,
        title: 'پروانه کسب (شبیه‌سازی)',
        trackingCode:
          typeof payload.trackingCode === 'string'
            ? payload.trackingCode
            : 'SIM-LICENSE',
        fullName: 'محمد فروتن',
        fatherName: 'قدیر',
        nationalCode,
        phone: mobile,
        issueDate: '1400/01/01',
        expireDate: '1405/01/01',
        province: 'مازندران',
        city: 'بابلسر',
        address: 'خیابان اصلی، پلاک ۱ (شبیه‌سازی)',
        postalCode: '4775144333',
        isActive: true,
      };
    }
    if (
      key === 'personinfo' ||
      key === 'persondata' ||
      key === 'nationalitystatus'
    ) {
      return {
        ...base,
        firstName: 'محمد',
        lastName: 'فروتن',
        fullName: 'محمد فروتن',
        fatherName: 'قدیر',
        nationalCode,
        birthDate:
          typeof payload.birthDate === 'string'
            ? payload.birthDate
            : '1370/04/05',
        alive: true,
        matched: true,
      };
    }
    if (key.startsWith('shahkar')) {
      return {
        ...base,
        matched: true,
        nationalCode,
        mobile,
        message: 'تطبیق کد ملی و موبایل موفق (شبیه‌سازی)',
      };
    }
    if (key === 'sana') {
      return { ...base, registered: true, nationalCode, isCompany: false };
    }
    return {
      ...base,
      ...payload,
      success: true,
      message: 'استعلام با موفقیت شبیه‌سازی شد.',
    };
  }

  /** api.ir answers with `{ data, success, code, message }`. */
  private normalise<T = Record<string, unknown>>(
    parsed: unknown,
    httpStatus: number,
    latencyMs: number,
  ): ApiIrCallResult<T> {
    const envelope =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as {
            data?: unknown;
            success?: unknown;
            code?: unknown;
            message?: unknown;
          })
        : null;
    const success =
      typeof envelope?.success === 'boolean' ? envelope.success : null;
    const httpOk = httpStatus >= 200 && httpStatus < 300;
    const ok = httpOk && success !== false;
    const code =
      typeof envelope?.code === 'number' || typeof envelope?.code === 'string'
        ? envelope.code
        : null;
    const message =
      typeof envelope?.message === 'string' && envelope.message.trim()
        ? envelope.message
        : ok
          ? 'موفق'
          : 'پاسخ نامعتبر از api.ir';
    return {
      ok,
      code,
      message,
      data: (envelope?.data as T | undefined) ?? null,
      httpStatus,
      latencyMs,
    };
  }

  // -------------------------------------------------------------------------
  //  Business helpers
  // -------------------------------------------------------------------------

  /** «استعلام اعتبار مجوز شغلی (پروانه کسب)» from a license tracking code. */
  async inquiryLicense(trackingCode: string): Promise<ApiIrCallResult> {
    const code = trackingCode.trim();
    if (!code) {
      throw new BadRequestException('کد پیگیری مجوز الزامی است');
    }
    return this.call('license', { trackingCode: code });
  }
}

function isLoopback(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname);
  } catch {
    return false;
  }
}
