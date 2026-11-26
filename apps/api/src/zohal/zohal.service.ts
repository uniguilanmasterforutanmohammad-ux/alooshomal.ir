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
import { PaymentStatus, Prisma, WalletEntryKind } from '@prisma/client';
import { randomBytes } from 'node:crypto';

import { ActivityService } from '../activity/activity.service';
import { paypingReturnBaseUrl } from '../common/app-url';
import { FacetsCacheService } from '../common/facets-cache.service';
import { FINANCE_SOURCE_TYPES } from '../finance/finance.constants';
import { FinanceService } from '../finance/finance.service';
import { PaymentSimulatorService } from '../payping/payment-simulator.service';
import { PaypingService } from '../payping/payping.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { WalletService } from '../wallet/wallet.service';
import {
  ZOHAL_SERVICES,
  ZOHAL_PRICE_SETTING_PREFIX,
  ZOHAL_SERVICE_SETTING_PREFIX,
} from './zohal.constants';
import type {
  ZohalCallResult,
  ZohalComposite,
  ZohalCompositeView,
  ZohalField,
  ZohalIdentity,
  ZohalServiceDef,
} from './zohal.types';

/** How long one Zohal call may take before it is abandoned. */
const REQUEST_TIMEOUT_MS = 25_000;

/** Setting prefix for the PayPing product mirrored from one Zohal service. */
const PAYPING_PRODUCT_SETTING_PREFIX = 'payping.product.zohal.';
/**
 * Legacy combined products that used to merge the two identity inquiries into
 * a single PayPing product. They are no longer created; the keys are kept only
 * so a sync can delete the stale product and its cached code.
 */
const LEGACY_IDENTITY_BUNDLE_KEYS = [
  'identity_bundle',
  'identity_license_bundle',
] as const;
const IDENTITY_SERVICE_KEYS = ['shahkar', 'national_identity_inquiry'] as const;

/** Setting that stores the admin-defined composite products as a JSON array. */
const COMPOSITE_SETTING_KEY = 'zohal.composites';
/** PayPing product key prefix for composites (kept apart from service keys). */
const COMPOSITE_PRODUCT_PREFIX = 'composite:';

/** Whether a service key is one of the two paid identity inquiries. */
function isIdentityServiceKey(key: string): boolean {
  return (IDENTITY_SERVICE_KEYS as readonly string[]).includes(key);
}

/** Loopback check used to auto-enable the simulator on a local machine. */
function isLoopbackUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname);
  } catch {
    return false;
  }
}

/** Admin-facing description of the Zohal connection. */
export interface ZohalStatus {
  configured: boolean;
  baseUrl: string;
  enabledCount: number;
  total: number;
}

/**
 * Thin client for the Zohal web services (`https://service.zohal.io`),
 * documented at https://dashboard.zohal.io/documents.
 *
 * The bearer token is read from `ZOHAL_TOKEN` and never leaves the server.
 * Every service is individually switchable through a `zohal.service.<key>`
 * setting so the admin can roll features out one at a time. Calls are
 * normalised into {@link ZohalCallResult} instead of throwing on business
 * errors, so the panel can show Zohal's own Persian message.
 *
 * NOTE: each real call is billed to the account wallet. The admin «آزمایش»
 * button is therefore explicit and labelled as a paid call.
 */
@Injectable()
export class ZohalService {
  private readonly logger = new Logger(ZohalService.name);
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly simulatorEnabled: boolean;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly activity: ActivityService,
    private readonly wallet: WalletService,
    private readonly facets: FacetsCacheService,
    private readonly payping: PaypingService,
    private readonly simulator: PaymentSimulatorService,
    private readonly finance: FinanceService,
  ) {
    this.baseUrl = (
      config.get<string>('ZOHAL_BASE_URL') ?? 'https://service.zohal.io'
    ).replace(/\/+$/, '');
    this.token = (config.get<string>('ZOHAL_TOKEN') ?? '').trim();

    // Local/staging stand-in for the two paid identity inquiries. When
    // `IDENTITY_SIMULATOR` is unset it turns itself on for any non-production
    // run whose public site URL is a loopback host, so a developer can finish
    // the identity flow without a Zohal token or a real (billed) inquiry.
    const nodeEnv = (
      config.get<string>('NODE_ENV') ?? 'development'
    ).toLowerCase();
    const appUrl = (
      config.get<string>('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000'
    ).replace(/\/+$/, '');
    const flag = (config.get<string>('IDENTITY_SIMULATOR') ?? '')
      .trim()
      .toLowerCase();
    this.simulatorEnabled =
      flag === 'true' ||
      (flag !== 'false' && nodeEnv !== 'production' && isLoopbackUrl(appUrl));
    if (this.simulatorEnabled) {
      this.logger.warn(
        'Identity simulator is ENABLED — Shahkar/identity inquiries are not sent to Zohal and are not charged.',
      );
    }
  }

  get configured(): boolean {
    return this.token.length > 0;
  }

  get publicBaseUrl(): string {
    return this.baseUrl;
  }

  /** Whether Shahkar/identity inquiries are answered locally. */
  get identitySimulated(): boolean {
    return this.simulatorEnabled;
  }

  private settingKey(key: string) {
    return `${ZOHAL_SERVICE_SETTING_PREFIX}${key}`;
  }

  private priceKey(key: string) {
    return `${ZOHAL_PRICE_SETTING_PREFIX}${key}`;
  }

  private findService(key: string): ZohalServiceDef {
    const service = ZOHAL_SERVICES.find((entry) => entry.key === key);
    if (!service) throw new NotFoundException('سرویس زحل یافت نشد');
    return service;
  }

  /** Per-service enabled map, defaulting to each service's `defaultEnabled`. */
  async getEnabledMap(): Promise<Record<string, boolean>> {
    const rows = await this.prisma.setting.findMany({
      where: { key: { startsWith: ZOHAL_SERVICE_SETTING_PREFIX } },
    });
    const byKey = new Map(rows.map((row) => [row.key, row.value]));
    const map: Record<string, boolean> = {};
    for (const service of ZOHAL_SERVICES) {
      const row = byKey.get(this.settingKey(service.key));
      map[service.key] = row ? row !== 'false' : service.defaultEnabled;
    }
    return map;
  }

  async isServiceEnabled(key: string): Promise<boolean> {
    const service = this.findService(key);
    const row = await this.prisma.setting.findUnique({
      where: { key: this.settingKey(key) },
    });
    return row ? row.value !== 'false' : service.defaultEnabled;
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
      action: 'ZOHAL_SERVICE_TOGGLED',
      summary: `${enabled ? 'فعال‌سازی' : 'غیرفعال‌سازی'} سرویس زحل «${service.label}»`,
      entityType: 'SETTING',
      entityId: this.settingKey(key),
    });
    return { key, enabled };
  }

  /** Per-service prices (Toman) charged to the user's wallet. */
  async getPriceMap(): Promise<Record<string, number>> {
    const rows = await this.prisma.setting.findMany({
      where: { key: { startsWith: ZOHAL_PRICE_SETTING_PREFIX } },
    });
    const byKey = new Map(rows.map((row) => [row.key, row.value]));
    const map: Record<string, number> = {};
    for (const service of ZOHAL_SERVICES) {
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
      action: 'ZOHAL_SERVICE_PRICED',
      summary: `تعیین هزینه ${clean.toLocaleString('fa-IR')} تومانی برای سرویس زحل «${service.label}»`,
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

  // -------------------------------------------------------------------------
  //  Composite products (ادمین چند ماژول را یک محصول می‌کند)
  // -------------------------------------------------------------------------

  private async readComposites(): Promise<ZohalComposite[]> {
    const row = await this.prisma.setting.findUnique({
      where: { key: COMPOSITE_SETTING_KEY },
    });
    if (!row?.value) return [];
    try {
      const parsed = JSON.parse(row.value) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (item): item is ZohalComposite =>
          Boolean(item) &&
          typeof (item as ZohalComposite).key === 'string' &&
          Array.isArray((item as ZohalComposite).serviceKeys),
      );
    } catch {
      return [];
    }
  }

  private async writeComposites(items: ZohalComposite[]): Promise<void> {
    await this.prisma.setting.upsert({
      where: { key: COMPOSITE_SETTING_KEY },
      create: { key: COMPOSITE_SETTING_KEY, value: JSON.stringify(items) },
      update: { value: JSON.stringify(items) },
    });
  }

  private assertServiceKeys(serviceKeys: string[]): void {
    if (!Array.isArray(serviceKeys) || serviceKeys.length === 0) {
      throw new BadRequestException('حداقل یک ماژول را انتخاب کنید.');
    }
    for (const key of serviceKeys) {
      this.findService(key);
    }
  }

  /** Effective price of a composite (fixed amount or sum of its modules). */
  private async resolveCompositeAmount(
    composite: Pick<ZohalComposite, 'amount' | 'serviceKeys'>,
  ): Promise<number> {
    if (composite.amount > 0) return Math.floor(composite.amount);
    const prices = await this.getPriceMap();
    return composite.serviceKeys.reduce(
      (sum, key) => sum + (prices[key] ?? 0),
      0,
    );
  }

  /**
   * Admin view of one composite: resolved price, module labels and whether it
   * can actually be sold online right now (all modules enabled, priced and
   * without file inputs).
   */
  private async compositeView(
    composite: ZohalComposite,
  ): Promise<ZohalCompositeView> {
    const [enabled, prices, amount] = await Promise.all([
      this.getEnabledMap(),
      this.getPriceMap(),
      this.resolveCompositeAmount(composite),
    ]);
    const services = composite.serviceKeys
      .map((key) => ZOHAL_SERVICES.find((service) => service.key === key))
      .filter((service): service is ZohalServiceDef => Boolean(service));
    const missing: string[] = [];
    for (const service of services) {
      if (!enabled[service.key]) missing.push(`«${service.label}» غیرفعال است`);
      else if ((prices[service.key] ?? 0) <= 0)
        missing.push(`«${service.label}» تعرفه ندارد`);
      if (service.fields.some((field) => field.type === 'file'))
        missing.push(`«${service.label}» به فایل نیاز دارد`);
    }
    const paypingRow = await this.prisma.setting.findUnique({
      where: {
        key: this.productSettingKey(`${COMPOSITE_PRODUCT_PREFIX}${composite.key}`),
      },
    });
    return {
      ...composite,
      amount,
      serviceLabels: services.map((service) => service.label),
      fields: this.compositeFields(composite.serviceKeys),
      services: services.map((service) => ({
        key: service.key,
        label: service.label,
        group: service.group,
        price: prices[service.key] ?? 0,
        enabled: enabled[service.key],
      })),
      purchasable: composite.enabled && amount >= 1000 && missing.length === 0,
      issues: missing,
      paypingCode: paypingRow?.value ?? null,
    };
  }

  async listComposites(): Promise<ZohalCompositeView[]> {
    const composites = await this.readComposites();
    return Promise.all(composites.map((item) => this.compositeView(item)));
  }

  /** One composite with its resolved price, fields and saleability. */
  async getComposite(key: string): Promise<ZohalCompositeView> {
    const composites = await this.readComposites();
    const composite = composites.find((item) => item.key === key);
    if (!composite) throw new NotFoundException('محصول ترکیبی یافت نشد');
    return this.compositeView(composite);
  }

  /**
   * Run every module of a composite **in the admin-defined order**. Used after
   * a payment settles (onboarding cart or a direct composite checkout). A
   * failing module does not abort the rest; the caller receives one result per
   * module so the panel can show exactly what succeeded.
   */
  async runComposite(
    key: string,
    payload: Record<string, unknown> = {},
    options: { userId?: string | null } = {},
  ): Promise<{
    key: string;
    label: string;
    amount: number;
    ok: boolean;
    modules: Array<{
      serviceKey: string;
      label: string;
      ok: boolean;
      message: string;
      data: unknown;
      latencyMs: number | null;
    }>;
  }> {
    const view = await this.getComposite(key);
    const modules: Array<{
      serviceKey: string;
      label: string;
      ok: boolean;
      message: string;
      data: unknown;
      latencyMs: number | null;
    }> = [];
    for (const service of view.services) {
      try {
        const result = await this.call(service.key, payload, {
          force: true,
          userId: options.userId ?? null,
        });
        modules.push({
          serviceKey: service.key,
          label: service.label,
          ok: result.ok,
          message: result.message,
          data: result.data,
          latencyMs: result.latencyMs,
        });
      } catch (error) {
        modules.push({
          serviceKey: service.key,
          label: service.label,
          ok: false,
          message:
            error instanceof Error ? error.message : 'اجرای ماژول ناموفق بود',
          data: null,
          latencyMs: null,
        });
      }
    }
    return {
      key: view.key,
      label: view.label,
      amount: view.amount,
      ok: modules.length > 0 && modules.every((module) => module.ok),
      modules,
    };
  }

  async createComposite(
    dto: {
      label: string;
      description?: string;
      serviceKeys: string[];
      amount?: number;
      enabled?: boolean;
    },
    actorId?: string,
  ) {
    const label = dto.label.trim();
    if (!label) throw new BadRequestException('نام محصول را وارد کنید.');
    this.assertServiceKeys(dto.serviceKeys);
    const composites = await this.readComposites();
    const now = new Date().toISOString();
    const composite: ZohalComposite = {
      key: `comp_${randomBytes(6).toString('hex')}`,
      label,
      description: dto.description?.trim() || null,
      serviceKeys: [...new Set(dto.serviceKeys)],
      amount: Math.max(0, Math.floor(dto.amount ?? 0)),
      enabled: dto.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    };
    composites.push(composite);
    await this.writeComposites(composites);
    await this.activity.log({
      actor: actorId ? { id: actorId } : null,
      action: 'ZOHAL_COMPOSITE_CREATED',
      summary: `ساخت محصول ترکیبی زحل «${composite.label}»`,
      entityType: 'SETTING',
      entityId: COMPOSITE_SETTING_KEY,
    });
    return this.compositeView(composite);
  }

  async updateComposite(
    key: string,
    dto: {
      label?: string;
      description?: string;
      serviceKeys?: string[];
      amount?: number;
      enabled?: boolean;
    },
    actorId?: string,
  ) {
    const composites = await this.readComposites();
    const index = composites.findIndex((item) => item.key === key);
    if (index < 0) throw new NotFoundException('محصول ترکیبی یافت نشد');
    if (dto.serviceKeys) this.assertServiceKeys(dto.serviceKeys);
    const current = composites[index];
    const updated: ZohalComposite = {
      ...current,
      label: dto.label !== undefined ? dto.label.trim() : current.label,
      description:
        dto.description !== undefined
          ? dto.description.trim() || null
          : current.description,
      serviceKeys: dto.serviceKeys
        ? [...new Set(dto.serviceKeys)]
        : current.serviceKeys,
      amount:
        dto.amount !== undefined
          ? Math.max(0, Math.floor(dto.amount))
          : current.amount,
      enabled: dto.enabled !== undefined ? dto.enabled : current.enabled,
      updatedAt: new Date().toISOString(),
    };
    if (!updated.label) {
      throw new BadRequestException('نام محصول را وارد کنید.');
    }
    composites[index] = updated;
    await this.writeComposites(composites);
    await this.activity.log({
      actor: actorId ? { id: actorId } : null,
      action: 'ZOHAL_COMPOSITE_UPDATED',
      summary: `ویرایش محصول ترکیبی زحل «${updated.label}»`,
      entityType: 'SETTING',
      entityId: COMPOSITE_SETTING_KEY,
    });
    return this.compositeView(updated);
  }

  async deleteComposite(key: string, actorId?: string) {
    const composites = await this.readComposites();
    const target = composites.find((item) => item.key === key);
    if (!target) throw new NotFoundException('محصول ترکیبی یافت نشد');
    await this.writeComposites(composites.filter((item) => item.key !== key));
    await this.prisma.setting
      .delete({
        where: {
          key: this.productSettingKey(`${COMPOSITE_PRODUCT_PREFIX}${key}`),
        },
      })
      .catch(() => undefined);
    await this.activity.log({
      actor: actorId ? { id: actorId } : null,
      action: 'ZOHAL_COMPOSITE_DELETED',
      summary: `حذف محصول ترکیبی زحل «${target.label}»`,
      entityType: 'SETTING',
      entityId: COMPOSITE_SETTING_KEY,
    });
    return { key, deleted: true };
  }

  /** Connection status + every service with its current switch state. */
  async listServices(): Promise<{
    status: ZohalStatus;
    services: Array<ZohalServiceDef & { enabled: boolean; price: number }>;
    composites: ZohalCompositeView[];
    payping: {
      products: Record<string, string | null>;
    };
  }> {
    const [enabled, prices, payping, composites] = await Promise.all([
      this.getEnabledMap(),
      this.getPriceMap(),
      this.getPaypingProducts(),
      this.listComposites(),
    ]);
    const services = ZOHAL_SERVICES.map((service) => ({
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
      composites,
      payping,
    };
  }

  /** Codes of the PayPing products already mirrored from Zohal services. */
  async getPaypingProducts(): Promise<{
    products: Record<string, string | null>;
  }> {
    const rows = await this.prisma.setting.findMany({
      where: { key: { startsWith: PAYPING_PRODUCT_SETTING_PREFIX } },
    });
    const byKey = new Map(
      rows.map((row) => [
        row.key.slice(PAYPING_PRODUCT_SETTING_PREFIX.length),
        row.value,
      ]),
    );
    const products: Record<string, string | null> = {};
    for (const service of ZOHAL_SERVICES) {
      products[service.key] = byKey.get(service.key) ?? null;
    }
    for (const composite of await this.readComposites()) {
      products[`${COMPOSITE_PRODUCT_PREFIX}${composite.key}`] =
        byKey.get(`${COMPOSITE_PRODUCT_PREFIX}${composite.key}`) ?? null;
    }
    return { products };
  }

  /**
   * Public tariff rows: enabled services with a positive price. The two
   * profile/blue-tick services are also hidden when their feature switch is
   * off, so the pricing page never advertises a capability that is stopped.
   */
  async publicPricing() {
    const [enabled, prices, identityEnabled, blueTickEnabled] =
      await Promise.all([
        this.getEnabledMap(),
        this.getPriceMap(),
        this.settings.isFeatureEnabled('featureIdentityInquiry'),
        this.settings.isFeatureEnabled('featureBlueTick'),
      ]);
    return ZOHAL_SERVICES.filter((service) => {
      if (!enabled[service.key]) return false;
      if ((prices[service.key] ?? 0) <= 0) return false;
      if (service.key === 'national_identity_inquiry' && !identityEnabled) {
        return false;
      }
      if (service.key === 'shahkar' && !blueTickEnabled) return false;
      return true;
    }).map((service) => ({
      key: service.key,
      label: service.label,
      group: service.group,
      description: service.description,
      price: prices[service.key],
    }));
  }

  // -------------------------------------------------------------------------
  //  PayPing products (آیتم‌های مالی)
  // -------------------------------------------------------------------------

  private productSettingKey(key: string) {
    return `${PAYPING_PRODUCT_SETTING_PREFIX}${key}`;
  }

  /**
   * Create or refresh one PayPing product and cache its code in settings.
   * Throws a descriptive error when the gateway is unavailable, the amount is
   * below the gateway minimum or PayPing refuses to create the product, so the
   * admin panel can show the real reason instead of a generic failure.
   */
  private async ensureProduct(
    key: string,
    title: string,
    amount: number,
    description?: string | null,
  ): Promise<string> {
    if (!this.payping.configured) {
      throw new ServiceUnavailableException(
        'توکن پی‌پینگ تنظیم نشده است؛ ابتدا تنظیمات درگاه را کامل کنید.',
      );
    }
    if (!Number.isFinite(amount) || amount < 1000) {
      throw new BadRequestException(
        'حداقل مبلغ محصول در درگاه پی‌پینگ ۱٬۰۰۰ تومان است.',
      );
    }
    const safeTitle = title.trim().slice(0, 120);
    const settingKey = this.productSettingKey(key);
    const row = await this.prisma.setting.findUnique({ where: { key: settingKey } });
    const payload = {
      title: safeTitle,
      description: description?.slice(0, 300) ?? undefined,
      amount,
      defineAmountByUser: false,
      haveTax: false,
      unlimited: true,
    };

    if (row?.value) {
      try {
        await this.payping.updateProduct({ ...payload, code: row.value });
        return row.value;
      } catch (error) {
        const status = (error as { paypingStatus?: number } | null)
          ?.paypingStatus;
        this.logger.warn(
          `PayPing product ${row.value} sync failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        // A 4xx (e.g. the product was deleted from the PayPing console) means
        // the cached code is dead, so fall through and recreate it. A transient
        // failure keeps the old code so a checkout can still go through.
        if (!(typeof status === 'number' && status >= 400 && status < 500)) {
          return row.value;
        }
      }
    }

    // Reuse a product that already exists with this exact title (created in
    // another environment or before its code was stored) instead of
    // duplicating it and letting PayPing reject the duplicate title.
    const existing = await this.payping
      .findProductCodeByTitle(safeTitle)
      .catch(() => null);
    if (existing && existing !== row?.value) {
      try {
        await this.payping.updateProduct({ ...payload, code: existing });
        await this.prisma.setting.upsert({
          where: { key: settingKey },
          create: { key: settingKey, value: existing },
          update: { value: existing },
        });
        return existing;
      } catch (error) {
        this.logger.warn(
          `PayPing product ${existing} reuse failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    const created = (await this.payping.createProduct(payload)) as {
      code?: string;
    } | null;
    if (!created?.code) {
      throw new BadGatewayException(
        'ساخت محصول در پی‌پینگ ناموفق بود؛ لطفاً دوباره تلاش کنید.',
      );
    }
    await this.prisma.setting.upsert({
      where: { key: settingKey },
      create: { key: settingKey, value: created.code },
      update: { value: created.code },
    });
    return created.code;
  }

  /**
   * Saleable identity bundle: both Shahkar and the identity inquiry must be
   * switched on and priced. A disabled service is never charged, so the
   * onboarding invoice cannot include a stopped inquiry.
   */
  async identityBundleQuote(): Promise<{
    shahkar: number;
    identity: number;
    total: number;
    available: boolean;
    shahkarEnabled: boolean;
    identityEnabled: boolean;
  }> {
    const [enabled, prices, identityFeature] = await Promise.all([
      this.getEnabledMap(),
      this.getPriceMap(),
      this.settings.isFeatureEnabled('featureIdentityInquiry'),
    ]);
    const shahkarEnabled = Boolean(enabled.shahkar);
    const identityEnabled = Boolean(enabled.national_identity_inquiry);
    const shahkar = shahkarEnabled ? prices.shahkar ?? 0 : 0;
    const identity = identityEnabled
      ? prices.national_identity_inquiry ?? 0
      : 0;
    const available =
      identityFeature &&
      shahkarEnabled &&
      identityEnabled &&
      shahkar > 0 &&
      identity > 0;
    return {
      shahkar,
      identity,
      total: available ? shahkar + identity : 0,
      available,
      shahkarEnabled,
      identityEnabled,
    };
  }

  /**
   * Create or refresh the PayPing product of one Zohal module. Every module —
   * including the two identity inquiries — gets its own independent product,
   * so it can be sold alone or as part of a composite.
   */
  async syncServiceProduct(key: string): Promise<string> {
    const service = this.findService(key);
    const [enabled, price] = await Promise.all([
      this.isServiceEnabled(key),
      this.getServicePrice(key),
    ]);
    if (!enabled) {
      throw new BadRequestException(
        `ماژول «${service.label}» غیرفعال است؛ ابتدا آن را فعال کنید.`,
      );
    }
    if (price < 1000) {
      throw new BadRequestException(
        `تعرفه‌ی «${service.label}» باید حداقل ۱٬۰۰۰ تومان باشد${
          price > 0
            ? ` (فعلی: ${price.toLocaleString('fa-IR')} تومان)`
            : ' (فعلی: ثبت نشده)'
        }.`,
      );
    }
    return this.ensureProduct(
      service.key,
      `${service.label} — شمالی‌کارت`,
      price,
      service.description,
    );
  }

  /**
   * Create or refresh the PayPing product of one composite. The composite
   * price is derived from its modules (unless a fixed amount is set), and the
   * modules keep their own independent products.
   */
  async syncCompositeProduct(key: string): Promise<string> {
    const composites = await this.readComposites();
    const composite = composites.find((item) => item.key === key);
    if (!composite) throw new NotFoundException('محصول ترکیبی یافت نشد');
    if (!composite.enabled) {
      throw new BadRequestException('این محصول ترکیبی غیرفعال است.');
    }
    const view = await this.compositeView(composite);
    if (view.issues.length > 0) {
      throw new BadRequestException(view.issues[0]);
    }
    if (view.amount < 1000) {
      throw new BadRequestException(
        'مبلغ این محصول ترکیبی باید حداقل ۱٬۰۰۰ تومان باشد.',
      );
    }
    return this.ensureProduct(
      `${COMPOSITE_PRODUCT_PREFIX}${composite.key}`,
      `${composite.label} — شمالی‌کارت`,
      view.amount,
      composite.description ??
        'چند استعلام زحل در یک پرداخت؛ همه‌ی ماژول‌های این محصول پس از پرداخت اجرا می‌شوند.',
    );
  }

  /**
   * Admin action: mirror every enabled, priced service into PayPing. Each
   * module gets its own product; the legacy combined identity product is
   * removed from PayPing and from the cached settings.
   */
  async syncPaypingProducts(): Promise<{
    products: Record<string, string | null>;
  }> {
    const [enabled, prices] = await Promise.all([
      this.getEnabledMap(),
      this.getPriceMap(),
    ]);
    const products: Record<string, string | null> = {};

    for (const service of ZOHAL_SERVICES) {
      if (!enabled[service.key]) continue;
      const price = prices[service.key] ?? 0;
      if (price < 1000) continue;
      try {
        products[service.key] = await this.ensureProduct(
          service.key,
          `${service.label} — شمالی‌کارت`,
          price,
          service.description,
        );
      } catch (error) {
        this.logger.warn(
          `PayPing product for Zohal ${service.key} failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        products[service.key] = null;
      }
    }

    for (const composite of await this.readComposites()) {
      const productKey = `${COMPOSITE_PRODUCT_PREFIX}${composite.key}`;
      try {
        products[productKey] = await this.syncCompositeProduct(composite.key);
      } catch (error) {
        this.logger.warn(
          `PayPing product for Zohal composite ${composite.key} failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        products[productKey] = null;
      }
    }

    await this.removeLegacyIdentityBundleProducts();
    return { products };
  }

  /**
   * Delete the old «شاهکار + هویتی» combined product from PayPing (when its
   * code is cached) and drop the setting row, so it can never be recreated.
   */
  private async removeLegacyIdentityBundleProducts(): Promise<void> {
    for (const key of LEGACY_IDENTITY_BUNDLE_KEYS) {
      const settingKey = this.productSettingKey(key);
      const row = await this.prisma.setting.findUnique({
        where: { key: settingKey },
      });
      if (!row) continue;
      if (row.value && this.payping.configured) {
        try {
          await this.payping.deleteProduct(row.value);
        } catch (error) {
          this.logger.warn(
            `Deleting legacy PayPing product ${row.value} failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
      await this.prisma.setting
        .delete({ where: { key: settingKey } })
        .catch(() => undefined);
    }
  }

  // -------------------------------------------------------------------------
  //  User-facing offer & composite checkout
  // -------------------------------------------------------------------------

  /** Fields a buyer must fill for a composite (union of its modules). */
  private compositeFields(serviceKeys: string[]) {
    const fields = new Map<
      string,
      {
        name: string;
        label: string;
        required: boolean;
        type: ZohalField['type'];
        placeholder?: string;
      }
    >();
    for (const key of serviceKeys) {
      const service = ZOHAL_SERVICES.find((item) => item.key === key);
      if (!service) continue;
      for (const field of service.fields) {
        const existing = fields.get(field.name);
        if (!existing) {
          fields.set(field.name, {
            name: field.name,
            label: field.label,
            required: Boolean(field.required),
            type: field.type ?? 'text',
            placeholder: field.placeholder,
          });
        } else if (field.required) {
          existing.required = true;
        }
      }
    }
    return [...fields.values()];
  }

  /**
   * Everything a signed-in user can buy online right now: priced modules
   * without file inputs plus the admin-defined composites.
   */
  async publicOffer() {
    await this.settings.assertFeatureEnabled('featureZohalInquiries');
    const [enabled, prices, composites] = await Promise.all([
      this.getEnabledMap(),
      this.getPriceMap(),
      this.listComposites(),
    ]);
    const services = ZOHAL_SERVICES.filter((service) => {
      if (!enabled[service.key]) return false;
      if ((prices[service.key] ?? 0) <= 0) return false;
      if (service.fields.some((field) => field.type === 'file')) return false;
      return true;
    }).map((service) => ({
      key: service.key,
      label: service.label,
      group: service.group,
      description: service.description,
      price: prices[service.key] ?? 0,
      fields: this.compositeFields([service.key]),
    }));
    return {
      services,
      composites: composites
        .filter((composite) => composite.purchasable)
        .map((composite) => ({
          key: composite.key,
          label: composite.label,
          description: composite.description,
          amount: composite.amount,
          serviceLabels: composite.serviceLabels,
          fields: this.compositeFields(composite.serviceKeys),
        })),
    };
  }

  /** Validate the buyer inputs against every module's required fields. */
  private assertCompositePayload(
    serviceKeys: string[],
    payload: Record<string, unknown>,
  ): void {
    for (const field of this.compositeFields(serviceKeys)) {
      if (!field.required) continue;
      const value = payload[field.name];
      if (value === undefined || value === null || String(value).trim() === '') {
        throw new BadRequestException(`مقدار «${field.label}» الزامی است.`);
      }
    }
  }

  private safeReturnTo(value?: string | null): string {
    return value && /^\/(?!\/)/.test(value)
      ? value.slice(0, 200)
      : '/dashboard/inquiries';
  }

  /**
   * Create one gateway payment for a composite. The selected modules and the
   * buyer's inputs are snapshotted on the payment so the callback can run all
   * of them after the gateway confirms the amount.
   */
  async checkoutComposite(
    userId: string,
    key: string,
    payload: Record<string, unknown> = {},
    returnTo?: string,
    options: { stopOnFailure?: boolean; moduleOrder?: string[] } = {},
  ) {
    await this.settings.assertFeatureEnabled('featureZohalInquiries');
    const composites = await this.readComposites();
    const composite = composites.find((item) => item.key === key);
    if (!composite) throw new NotFoundException('محصول ترکیبی یافت نشد');
    if (!composite.enabled) {
      throw new BadRequestException('این محصول در حال حاضر غیرفعال است.');
    }
    const view = await this.compositeView(composite);
    if (!view.purchasable) {
      throw new BadRequestException(
        view.issues[0] ?? 'این محصول در حال حاضر قابل خرید نیست.',
      );
    }
    this.assertCompositePayload(composite.serviceKeys, payload);
    const amount = view.amount;
    if (amount < 1000) {
      throw new BadRequestException('مبلغ این محصول برای پرداخت آنلاین معتبر نیست.');
    }
    const orderedKeys = options.moduleOrder
      ? [
          ...options.moduleOrder.filter((serviceKey) =>
            composite.serviceKeys.includes(serviceKey),
          ),
          ...composite.serviceKeys.filter(
            (serviceKey) => !options.moduleOrder?.includes(serviceKey),
          ),
        ]
      : composite.serviceKeys;
    const modules = orderedKeys.map((serviceKey) => {
      const service = this.findService(serviceKey);
      return {
        serviceKey,
        label: service.label,
        amount: view.services.find((item) => item.key === serviceKey)?.price ?? 0,
        payload,
      };
    });
    return this.startServiceCheckout(userId, {
      serviceKey: `${COMPOSITE_PRODUCT_PREFIX}${composite.key}`,
      title: composite.label,
      amount,
      modules,
      returnTo,
      stopOnFailure: options.stopOnFailure,
    });
  }

  /**
   * The admin-defined composite that verifies a bank card against the owner's
   * national code and converts it to an IBAN. Used by the card-to-card module;
   * detection is by service keys so the admin only has to create the product.
   */
  async findCardVerificationComposite(): Promise<ZohalCompositeView | null> {
    const required = ['check_card_with_national_code', 'card_to_iban'];
    const composites = await this.listComposites();
    const candidates = composites.filter(
      (composite) => required.every((key) => composite.serviceKeys.includes(key)),
    );
    const enabled = candidates.filter((composite) => composite.enabled);
    return (
      enabled.find((composite) => composite.serviceKeys.length === 2) ??
      enabled[0] ??
      candidates.find((composite) => composite.serviceKeys.length === 2) ??
      candidates[0] ??
      null
    );
  }

  /** Latest paid run of a composite for one user (for post-payment delivery). */
  async latestCompositePayment(userId: string, key: string) {
    return this.prisma.servicePayment.findFirst({
      where: {
        userId,
        serviceKey: `${COMPOSITE_PRODUCT_PREFIX}${key}`,
        status: PaymentStatus.PAID,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Buy one priced module on its own (same delivery path as a composite). */
  async checkoutService(
    userId: string,
    key: string,
    payload: Record<string, unknown> = {},
    returnTo?: string,
  ) {
    await this.settings.assertFeatureEnabled('featureZohalInquiries');
    const service = this.findService(key);
    const [enabled, price] = await Promise.all([
      this.isServiceEnabled(key),
      this.getServicePrice(key),
    ]);
    if (!enabled) {
      throw new BadRequestException('این ماژول در حال حاضر غیرفعال است.');
    }
    if (service.fields.some((field) => field.type === 'file')) {
      throw new BadRequestException(
        'این ماژول به فایل نیاز دارد و از این مسیر قابل خرید نیست.',
      );
    }
    if (price < 1000) {
      throw new BadRequestException('تعرفه‌ی این ماژول برای پرداخت آنلاین معتبر نیست.');
    }
    this.assertCompositePayload([key], payload);
    return this.startServiceCheckout(userId, {
      serviceKey: key,
      title: service.label,
      amount: price,
      modules: [{ serviceKey: key, label: service.label, amount: price, payload }],
      returnTo,
    });
  }

  private async startServiceCheckout(
    userId: string,
    input: {
      serviceKey: string;
      title: string;
      amount: number;
      modules: Array<{
        serviceKey: string;
        label: string;
        amount: number;
        payload: Record<string, unknown>;
      }>;
      returnTo?: string;
      stopOnFailure?: boolean;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, phone: true, email: true, fullName: true },
    });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    const { serviceKey, title, amount, modules } = input;
    const items = {
      modules,
      returnTo: this.safeReturnTo(input.returnTo),
      stopOnFailure: Boolean(input.stopOnFailure),
    };

    await this.prisma.servicePayment.updateMany({
      where: { userId, serviceKey, status: PaymentStatus.PENDING },
      data: {
        status: PaymentStatus.CANCELED,
        failureReason: 'پرداخت جدید جایگزین شد',
      },
    });
    const clientRefId = randomBytes(16).toString('hex');
    const payment = await this.prisma.servicePayment.create({
      data: {
        userId,
        serviceKey,
        title,
        amount,
        items: items as unknown as Prisma.InputJsonValue,
        clientRefId,
      },
    });

    const returnUrl = `${paypingReturnBaseUrl()}/api/zohal/payments/callback`;
    let result: { paymentCode?: string; url?: string } | null = null;
    try {
      result = this.simulator.isEnabled
        ? this.simulator.createPayment({
            amount,
            returnUrl,
            clientRefId,
            description: `${title} — شمالی‌کارت`,
          })
        : ((await this.payping.createPayment({
            amount,
            returnUrl,
            payerIdentity: user.phone ?? user.email ?? undefined,
            payerName: user.fullName ?? undefined,
            description: `${title} — شمالی‌کارت`,
            clientRefId,
            isReversible: false,
          })) as { paymentCode?: string; url?: string } | null);
    } catch (error) {
      await this.prisma.servicePayment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason:
            error instanceof Error
              ? error.message.slice(0, 300)
              : 'ساخت پرداخت ناموفق بود',
        },
      });
      throw error;
    }
    if (!result?.paymentCode || !result?.url) {
      await this.prisma.servicePayment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED, failureReason: 'پاسخ نامعتبر از درگاه' },
      });
      throw new BadRequestException('ساخت پرداخت در درگاه ناموفق بود');
    }
    const updated = await this.prisma.servicePayment.update({
      where: { id: payment.id },
      data: { paymentCode: result.paymentCode, gatewayUrl: result.url },
    });
    return {
      paymentId: updated.id,
      amount: updated.amount,
      url: updated.gatewayUrl,
      paymentCode: updated.paymentCode,
    };
  }

  private compositeItems(payment: {
    items: Prisma.JsonValue | null;
  }): {
    modules: Array<{
      serviceKey: string;
      label: string;
      amount: number;
      payload: Record<string, unknown>;
    }>;
    returnTo: string;
    stopOnFailure: boolean;
  } {
    const raw = (payment.items ?? {}) as {
      modules?: unknown;
      returnTo?: unknown;
      stopOnFailure?: unknown;
    };
    const modules = Array.isArray(raw.modules)
      ? (raw.modules as Array<Record<string, unknown>>)
          .filter((item) => typeof item?.serviceKey === 'string')
          .map((item) => ({
            serviceKey: String(item.serviceKey),
            label: String(item.label ?? item.serviceKey),
            amount: Number(item.amount ?? 0),
            payload:
              item.payload && typeof item.payload === 'object'
                ? (item.payload as Record<string, unknown>)
                : {},
          }))
      : [];
    return {
      modules,
      returnTo: this.safeReturnTo(
        typeof raw.returnTo === 'string' ? raw.returnTo : null,
      ),
      stopOnFailure: raw.stopOnFailure === true,
    };
  }

  /** Run every module of a paid composite and store the results. */
  private async runCompositePayment(paymentId: string) {
    const payment = await this.prisma.servicePayment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('پرداخت یافت نشد');
    if (payment.consumedAt) return;
    const { modules, stopOnFailure } = this.compositeItems(payment);
    const results: Array<Record<string, unknown>> = [];
    for (const module of modules) {
      let entry: Record<string, unknown>;
      try {
        const result = await this.call(module.serviceKey, module.payload, {
          force: true,
        });
        entry = {
          serviceKey: module.serviceKey,
          label: module.label,
          ok: result.ok,
          message: result.message,
          data: result.data,
          latencyMs: result.latencyMs,
        };
      } catch (error) {
        entry = {
          serviceKey: module.serviceKey,
          label: module.label,
          ok: false,
          message:
            error instanceof Error ? error.message : 'اجرای ماژول ناموفق بود',
          data: null,
          latencyMs: null,
        };
      }
      results.push(entry);
      if (stopOnFailure && !this.moduleSucceeded(entry)) {
        break;
      }
    }
    await this.prisma.servicePayment.update({
      where: { id: payment.id },
      data: {
        result: results as unknown as Prisma.InputJsonValue,
        consumedAt: new Date(),
      },
    });
  }

  /** A module is successful when the call succeeded and no `matched` flag is false. */
  private moduleSucceeded(entry: Record<string, unknown>): boolean {
    if (entry.ok !== true) return false;
    const data = entry.data;
    if (!data || typeof data !== 'object') return true;
    const matched = (data as Record<string, unknown>).matched;
    if (matched === undefined || matched === null) return true;
    return matched === true || matched === 'true' || matched === 1;
  }

  /** Gateway return URL for composite payments. */
  async handleCompositePaymentCallback(params: {
    paymentCode?: string;
    refId?: string;
    clientRefId?: string;
    status?: number;
  }) {
    const paymentCode = params.paymentCode?.trim() || undefined;
    const clientRefId = params.clientRefId?.trim() || undefined;
    const refId = params.refId?.trim() || undefined;
    const payment = paymentCode
      ? await this.prisma.servicePayment.findUnique({ where: { paymentCode } })
      : clientRefId
        ? await this.prisma.servicePayment.findUnique({ where: { clientRefId } })
        : null;
    if (!payment) {
      return { redirectUrl: `${paypingReturnBaseUrl()}/dashboard/inquiries?payment=failed` };
    }
    const { returnTo } = this.compositeItems(payment);
    const redirect = (status: 'success' | 'failed') => {
      const separator = returnTo.includes('?') ? '&' : '?';
      return {
        redirectUrl: `${paypingReturnBaseUrl()}${returnTo}${separator}payment=${status}`,
      };
    };
    if (payment.status === PaymentStatus.PAID) {
      if (!payment.consumedAt) {
        try {
          await this.runCompositePayment(payment.id);
        } catch {
          return redirect('failed');
        }
      }
      return redirect('success');
    }
    if (payment.status === PaymentStatus.CANCELED) return redirect('failed');
    if (params.status === 0) {
      await this.prisma.servicePayment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason: 'پرداخت توسط کاربر لغو شد یا درگاه آن را ناموفق اعلام کرد',
        },
      });
      return redirect('failed');
    }
    if (!refId || !payment.paymentCode) {
      await this.prisma.servicePayment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED, failureReason: 'اطلاعات بازگشتی ناقص است' },
      });
      return redirect('failed');
    }
    let verified: { amount?: number } | null = null;
    try {
      verified = this.simulator.handles(payment.paymentCode)
        ? this.simulator.verifyPayment({
            paymentCode: payment.paymentCode,
            amount: payment.amount,
            clientRefId: payment.clientRefId,
          })
        : ((await this.payping.verifyPayment({
            paymentRefId: Number(refId),
            paymentCode: payment.paymentCode,
            amount: payment.amount,
          })) as { amount?: number } | null);
    } catch (error) {
      await this.prisma.servicePayment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason:
            error instanceof Error ? error.message.slice(0, 300) : 'تأیید پرداخت ناموفق بود',
        },
      });
      return redirect('failed');
    }
    if (!verified || Number(verified.amount ?? 0) !== payment.amount) {
      await this.prisma.servicePayment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED, failureReason: 'مبلغ تأییدشده مطابق نیست' },
      });
      return redirect('failed');
    }
    await this.prisma.servicePayment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        refId,
        paidAt: new Date(),
        verifiedAt: new Date(),
      },
    });
    try {
      await this.finance.recordSale({
        sourceType: FINANCE_SOURCE_TYPES.SERVICE_PAYMENT,
        sourceId: payment.id,
        title: payment.title ?? 'محصول ترکیبی استعلام زحل',
        amount: payment.amount,
        paidAt: new Date(),
        userId: payment.userId,
        metadata: { serviceKey: payment.serviceKey, refId },
      });
    } catch {
      // Invoicing is best-effort; the paid modules must still run.
    }
    try {
      await this.runCompositePayment(payment.id);
      return redirect('success');
    } catch (error) {
      await this.prisma.servicePayment.update({
        where: { id: payment.id },
        data: {
          failureReason:
            error instanceof Error ? error.message.slice(0, 300) : 'اجرای استعلام ناموفق بود',
        },
      });
      return redirect('failed');
    }
  }

  // -------------------------------------------------------------------------
  //  Transport
  // -------------------------------------------------------------------------

  /**
   * Call one Zohal service. `force` lets the admin «آزمایش» button run a
   * disabled service without first switching it on.
   */
  async call<T = Record<string, unknown>>(
    key: string,
    payload: Record<string, unknown> = {},
    options: { force?: boolean; userId?: string | null } = {},
  ): Promise<ZohalCallResult<T>> {
    const result = await this.performCall<T>(key, payload, options);
    await this.logInquiry(key, payload, result, options.userId ?? null);
    return result;
  }

  private async logInquiry(
    key: string,
    payload: Record<string, unknown>,
    result: ZohalCallResult<unknown>,
    userId: string | null,
  ): Promise<void> {
    try {
      await this.prisma.inquiryLog.create({
        data: {
          provider: 'ZOHAL',
          serviceKey: key,
          userId,
          nationalCode:
            typeof payload.national_code === 'string'
              ? payload.national_code
              : null,
          phone: typeof payload.mobile === 'string' ? payload.mobile : null,
          ok: result.ok,
          resultCode: result.result,
          httpStatus: result.httpStatus,
          message: result.message?.slice(0, 500) ?? null,
          errorCode: result.errorCode,
          latencyMs: result.latencyMs,
          request: payload as Prisma.InputJsonValue,
          response: (result.data ?? undefined) as
            | Prisma.InputJsonValue
            | undefined,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Inquiry log write failed (${key}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async performCall<T = Record<string, unknown>>(
    key: string,
    payload: Record<string, unknown> = {},
    options: { force?: boolean } = {},
  ): Promise<ZohalCallResult<T>> {
    const service = this.findService(key);
    if (!options.force && !(await this.isServiceEnabled(key))) {
      throw new ForbiddenException(
        `سرویس «${service.label}» در پنل مدیریت غیرفعال است.`,
      );
    }
    if (this.simulatorEnabled && isIdentityServiceKey(key)) {
      return this.simulatedIdentityCall<T>(key, payload);
    }
    if (!this.configured) {
      throw new ServiceUnavailableException(
        'توکن زحل تنظیم نشده است. مقدار ZOHAL_TOKEN را در محیط سرور قرار دهید.',
      );
    }

    let path = service.path;
    for (const param of service.pathParams ?? []) {
      const value = payload[param];
      if (value === undefined || value === null || value === '') {
        throw new BadRequestException(`پارامتر «${param}» الزامی است`);
      }
      path = path.replace(`{${param}}`, encodeURIComponent(String(value)));
    }
    const body = { ...payload };
    for (const param of service.pathParams ?? []) delete body[param];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const startedAt = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: service.method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: service.method === 'GET' ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      const latencyMs = Date.now() - startedAt;
      const text = await response.text();
      let parsed: unknown = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = null;
      }
      return this.normalise<T>(parsed, response.status, latencyMs);
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const aborted = error instanceof Error && error.name === 'AbortError';
      this.logger.warn(
        `Zohal ${key} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        ok: false,
        result: null,
        message: aborted
          ? 'پاسخ زحل در زمان مجاز دریافت نشد.'
          : 'ارتباط با سرویس زحل برقرار نشد.',
        errorCode: aborted ? 'timeout' : 'network_error',
        data: null,
        httpStatus: null,
        latencyMs,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private normalise<T = Record<string, unknown>>(
    parsed: unknown,
    httpStatus: number,
    latencyMs: number,
  ): ZohalCallResult<T> {
    const envelope = (parsed ?? {}) as {
      result?: number;
      response_body?: {
        data?: Record<string, unknown>;
        message?: string;
        error_code?: string | null;
      };
    };
    const result =
      typeof envelope.result === 'number' ? envelope.result : null;
    const body = envelope.response_body ?? {};
    const ok = httpStatus >= 200 && httpStatus < 300 && result === 1;
    return {
      ok,
      result,
      message: body.message ?? (ok ? 'موفق' : 'پاسخ نامعتبر از زحل'),
      errorCode: body.error_code ?? null,
      data: (body.data as T | undefined) ?? null,
      httpStatus,
      latencyMs,
    };
  }

  /**
   * Local answer for the two paid identity inquiries. Both are reported as a
   * successful match with `httpStatus: null`, which is the same signal a
   * network failure uses and therefore never charges the user's wallet.
   */
  private async simulatedIdentityCall<T>(
    key: string,
    payload: Record<string, unknown>,
  ): Promise<ZohalCallResult<T>> {
    const nationalCode =
      typeof payload.national_code === 'string'
        ? payload.national_code.trim()
        : '';
    if (key === 'shahkar') {
      return {
        ok: true,
        result: 1,
        message: 'شبیه‌سازی محلی — شماره موبایل با کد ملی تطبیق داده شد.',
        errorCode: null,
        data: { matched: true } as T,
        httpStatus: null,
        latencyMs: 0,
      };
    }

    const profile = await this.simulatedIdentityProfile(nationalCode);
    return {
      ok: true,
      result: 1,
      message: 'شبیه‌سازی محلی — استعلام هویت انجام شد.',
      errorCode: null,
      data: {
        matched: true,
        first_name: profile.firstName,
        last_name: profile.lastName,
        father_name: profile.fatherName,
        national_code: nationalCode || null,
        alive: true,
        is_dead: false,
      } as T,
      httpStatus: null,
      latencyMs: 0,
    };
  }

  /**
   * Reuse the name already saved on the account (registration or a previous
   * edit) instead of inventing one, so the simulated inquiry fills the profile
   * with something recognisable.
   */
  private async simulatedIdentityProfile(nationalCode: string): Promise<{
    firstName: string;
    lastName: string;
    fatherName: string;
  }> {
    const user = nationalCode
      ? await this.prisma.user.findFirst({
          where: { nationalCode },
          select: { firstName: true, lastName: true, fullName: true },
        })
      : null;
    const firstName = user?.firstName?.trim() ?? '';
    const lastName = user?.lastName?.trim() ?? '';
    if (firstName && lastName) {
      return { firstName, lastName, fatherName: 'شبیه‌سازی' };
    }
    const [firstPart, ...rest] = (user?.fullName ?? '').trim().split(/\s+/);
    return {
      firstName: firstPart || 'کاربر',
      lastName: rest.join(' ') || 'آزمایشی',
      fatherName: 'شبیه‌سازی',
    };
  }

  // -------------------------------------------------------------------------
  //  Identity helpers (profile completion + blue tick)
  // -------------------------------------------------------------------------

  /** Whether the identity-inquiry feature is usable right now. */
  async identityInquiryAvailable(): Promise<boolean> {
    if (!(await this.settings.isFeatureEnabled('featureIdentityInquiry'))) {
      return false;
    }
    if (this.simulatorEnabled) return true;
    if (!this.configured) return false;
    return this.isServiceEnabled('national_identity_inquiry');
  }

  /** Name/father/alive inquiry from national code + Jalali birth date. */
  async inquiryIdentity(
    nationalCode: string,
    birthDate: string,
    options: { userId?: string | null } = {},
  ): Promise<ZohalCallResult<ZohalIdentity>> {
    return this.call<ZohalIdentity>(
      'national_identity_inquiry',
      {
        national_code: nationalCode,
        birth_date: birthDate,
      },
      { userId: options.userId ?? null },
    );
  }

  /** Shahkar: does this mobile number belong to this national code? */
  async verifyPhoneOwnership(
    mobile: string,
    nationalCode: string,
    options: { userId?: string | null } = {},
  ): Promise<ZohalCallResult<{ matched: boolean }>> {
    return this.call<{ matched: boolean }>(
      'shahkar',
      {
        mobile,
        national_code: nationalCode,
      },
      { userId: options.userId ?? null },
    );
  }

  // -------------------------------------------------------------------------
  //  «تیک آبی» (blue tick)
  // -------------------------------------------------------------------------

  /**
   * A user asks for the blue tick. Requires a completed identity (national
   * code + birth date) and a verified phone, then re-checks the identity with
   * one Zohal inquiry before filing the request for admin review.
   */
  async requestBlueTick(userId: string) {
    await this.settings.assertFeatureEnabled('featureBlueTick');
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        phoneVerified: true,
        nationalCode: true,
        birthDate: true,
        firstName: true,
        lastName: true,
        phoneMatchVerifiedAt: true,
        identityVerifiedAt: true,
        verifiedAt: true,
        blueTickRequestedAt: true,
      },
    });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    if (user.verifiedAt) {
      throw new BadRequestException('حساب شما از قبل تیک آبی دارد.');
    }
    if (!user.nationalCode || !user.birthDate) {
      throw new BadRequestException(
        'برای درخواست تیک آبی ابتدا مشخصات هویتی (کد ملی و تاریخ تولد) را در پروفایل تکمیل کنید.',
      );
    }
    if (!user.identityVerifiedAt) {
      throw new BadRequestException(
        'برای درخواست تیک آبی ابتدا استعلام هویت را در پروفایل کامل کنید.',
      );
    }
    if (!user.phone || !user.phoneVerified) {
      throw new BadRequestException(
        'برای درخواست تیک آبی، شماره موبایل حساب باید تأیید شده باشد.',
      );
    }
    if (user.blueTickRequestedAt) {
      throw new BadRequestException(
        'درخواست تیک آبی شما ثبت شده و در انتظار بررسی مدیر است.',
      );
    }

    // Blue tick needs a fresh Shahkar match (the phone number belongs to this
    // national code), not another identity lookup.
    const inquiry = await this.verifyPhoneOwnership(
      user.phone,
      user.nationalCode,
      { userId },
    );
    if (!inquiry.ok) {
      throw new BadRequestException(
        inquiry.message || 'استعلام شاهکار انجام نشد؛ لطفاً دوباره تلاش کنید.',
      );
    }
    if (!inquiry.data?.matched) {
      throw new BadRequestException(
        'شماره‌ی موبایل تأییدشده با این کد ملی تطبیق ندارد؛ شماره و کد ملی را بررسی کنید.',
      );
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        blueTickRequestedAt: new Date(),
        phoneMatchVerifiedAt: new Date(),
        blueTickNote: null,
      },
      select: {
        blueTickRequestedAt: true,
        phoneMatchVerifiedAt: true,
      },
    });
    // A simulated (or failed) call answered nothing upstream, so it must not
    // consume the paid inquiry.
    if (inquiry.httpStatus !== null) {
      const price = await this.getServicePrice('shahkar');
      await this.wallet.charge({
        userId,
        kind: WalletEntryKind.PHONE_MATCH,
        amount: price,
        title: 'تطبیق شماره موبایل و کد ملی',
        sourceType: 'ZOHAL',
        sourceId: 'shahkar',
      });
    }
    await this.activity.log({
      actor: { id: userId },
      action: 'BLUE_TICK_REQUESTED',
      summary: 'درخواست تیک آبی ثبت شد',
      entityType: 'USER',
      entityId: userId,
    });
    return { requested: true, ...updated };
  }

  /** Pending blue-tick requests, newest first. */
  async listBlueTickRequests() {
    const [pending, verified] = await Promise.all([
      this.prisma.user.findMany({
        where: { blueTickRequestedAt: { not: null }, verifiedAt: null },
        orderBy: { blueTickRequestedAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          firstName: true,
          lastName: true,
          phone: true,
          nationalCode: true,
          birthDate: true,
          phoneMatchVerifiedAt: true,
          blueTickRequestedAt: true,
          blueTickNote: true,
          documents: true,
        },
      }),
      this.prisma.user.findMany({
        where: { verifiedAt: { not: null } },
        orderBy: { verifiedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          fullName: true,
          phone: true,
          verifiedAt: true,
        },
      }),
    ]);
    return { pending, verified };
  }

  async decideBlueTick(
    adminId: string,
    userId: string,
    decision: 'APPROVED' | 'REJECTED',
    reason?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, blueTickRequestedAt: true },
    });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    if (!user.blueTickRequestedAt) {
      throw new BadRequestException('درخواست تیک آبی فعالی برای این کاربر نیست.');
    }
    const approved = decision === 'APPROVED';
    if (approved) {
      await this.wallet.assertSettled(
        userId,
        'کاربر برای اعمال تیک آبی باید ابتدا بدهی کیف پول خود را تسویه کند.',
      );
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        blueTickRequestedAt: null,
        verifiedAt: approved ? new Date() : null,
        blueTickNote: reason?.trim() || null,
      },
      select: { id: true, verifiedAt: true, blueTickNote: true },
    });
    // Public directory pages are cached; drop them so the new badge shows up
    // immediately instead of after the cache TTL.
    this.facets.invalidateDirectory('biolink');
    this.facets.invalidateDirectory('businesscard');
    await this.activity.log({
      actor: { id: adminId },
      action: approved ? 'BLUE_TICK_APPROVED' : 'BLUE_TICK_REJECTED',
      summary: `${approved ? 'تأیید' : 'رد'} درخواست تیک آبی «${user.fullName ?? user.id}»${reason ? ` — ${reason}` : ''}`,
      entityType: 'USER',
      entityId: userId,
    });
    return updated;
  }
}
