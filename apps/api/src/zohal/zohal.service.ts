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
import { SettingsService } from '../settings/settings.service';
import {
  ZOHAL_SERVICES,
  ZOHAL_PRICE_SETTING_PREFIX,
  ZOHAL_SERVICE_SETTING_PREFIX,
} from './zohal.constants';
import type {
  ZohalCallResult,
  ZohalIdentity,
  ZohalServiceDef,
} from './zohal.types';

/** How long one Zohal call may take before it is abandoned. */
const REQUEST_TIMEOUT_MS = 25_000;

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

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly activity: ActivityService,
  ) {
    this.baseUrl = (
      config.get<string>('ZOHAL_BASE_URL') ?? 'https://service.zohal.io'
    ).replace(/\/+$/, '');
    this.token = (config.get<string>('ZOHAL_TOKEN') ?? '').trim();
  }

  get configured(): boolean {
    return this.token.length > 0;
  }

  get publicBaseUrl(): string {
    return this.baseUrl;
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

  /** Connection status + every service with its current switch state. */
  async listServices(): Promise<{
    status: ZohalStatus;
    services: Array<ZohalServiceDef & { enabled: boolean; price: number }>;
  }> {
    const [enabled, prices] = await Promise.all([
      this.getEnabledMap(),
      this.getPriceMap(),
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
    };
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
    options: { force?: boolean } = {},
  ): Promise<ZohalCallResult<T>> {
    const service = this.findService(key);
    if (!this.configured) {
      throw new ServiceUnavailableException(
        'توکن زحل تنظیم نشده است. مقدار ZOHAL_TOKEN را در محیط سرور قرار دهید.',
      );
    }
    if (!options.force && !(await this.isServiceEnabled(key))) {
      throw new ForbiddenException(
        `سرویس «${service.label}» در پنل مدیریت غیرفعال است.`,
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

  // -------------------------------------------------------------------------
  //  Identity helpers (profile completion + blue tick)
  // -------------------------------------------------------------------------

  /** Whether the identity-inquiry feature is usable right now. */
  async identityInquiryAvailable(): Promise<boolean> {
    if (!this.configured) return false;
    if (!(await this.settings.isFeatureEnabled('featureIdentityInquiry'))) {
      return false;
    }
    return this.isServiceEnabled('national_identity_inquiry');
  }

  /** Name/father/alive inquiry from national code + Jalali birth date. */
  async inquiryIdentity(
    nationalCode: string,
    birthDate: string,
  ): Promise<ZohalCallResult<ZohalIdentity>> {
    return this.call<ZohalIdentity>('national_identity_inquiry', {
      national_code: nationalCode,
      birth_date: birthDate,
    });
  }

  /** Shahkar: does this mobile number belong to this national code? */
  async verifyPhoneOwnership(
    mobile: string,
    nationalCode: string,
  ): Promise<ZohalCallResult<{ matched: boolean }>> {
    return this.call<{ matched: boolean }>('shahkar', {
      mobile,
      national_code: nationalCode,
    });
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

    const inquiry = await this.inquiryIdentity(user.nationalCode, user.birthDate);
    if (!inquiry.ok || !inquiry.data?.matched) {
      throw new BadRequestException(
        inquiry.message ||
          'استعلام هویت موفق نبود؛ کد ملی و تاریخ تولد را بررسی کنید.',
      );
    }
    const firstName = inquiry.data.first_name?.trim();
    const lastName = inquiry.data.last_name?.trim();
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        blueTickRequestedAt: new Date(),
        blueTickNote: null,
        ...(firstName && lastName
          ? { firstName, lastName, fullName: `${firstName} ${lastName}` }
          : {}),
      },
      select: {
        blueTickRequestedAt: true,
        firstName: true,
        lastName: true,
      },
    });
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
          blueTickRequestedAt: true,
          blueTickNote: true,
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
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        blueTickRequestedAt: null,
        verifiedAt: approved ? new Date() : null,
        blueTickNote: reason?.trim() || null,
      },
      select: { id: true, verifiedAt: true, blueTickNote: true },
    });
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
