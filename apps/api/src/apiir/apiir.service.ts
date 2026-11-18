import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  APIIR_PRICE_SETTING_PREFIX,
  APIIR_SERVICES,
  APIIR_SERVICE_SETTING_PREFIX,
} from './apiir.constants';
import type { ApiIrCallResult, ApiIrServiceDef } from './apiir.types';

/** How long one api.ir call may take before it is abandoned. */
const REQUEST_TIMEOUT_MS = 30_000;

/** Admin-facing description of the api.ir connection. */
export interface ApiIrStatus {
  configured: boolean;
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

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
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
  }

  get configured(): boolean {
    return this.token.length > 0;
  }

  get publicBaseUrl(): string {
    return this.baseUrl;
  }

  private settingKey(key: string) {
    return `${APIIR_SERVICE_SETTING_PREFIX}${key}`;
  }

  private priceKey(key: string) {
    return `${APIIR_PRICE_SETTING_PREFIX}${key}`;
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

  /** Connection status + every service with its current switch/price. */
  async listServices(): Promise<{
    status: ApiIrStatus;
    services: Array<ApiIrServiceDef & { enabled: boolean; price: number }>;
  }> {
    const [enabled, prices] = await Promise.all([
      this.getEnabledMap(),
      this.getPriceMap(),
    ]);
    const services = APIIR_SERVICES.map((service) => ({
      ...service,
      enabled: enabled[service.key],
      price: prices[service.key] ?? 0,
    }));
    return {
      status: {
        configured: this.configured,
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
