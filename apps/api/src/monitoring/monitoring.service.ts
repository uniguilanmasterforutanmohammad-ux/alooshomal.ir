import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { statfs } from 'node:fs/promises';
import os from 'node:os';

import { MailService } from '../auth/mail.service';
import { SmsService } from '../auth/sms.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMonitoringDto } from './dto/update-monitoring.dto';

// ---------------------------------------------------------------------------
//  Setting keys (stored in the shared `settings` table)
// ---------------------------------------------------------------------------

export const MONITORING_ENABLED_KEY = 'monitoringEnabled';
export const MONITORING_RAM_THRESHOLD_KEY = 'monitoringRamThreshold';
export const MONITORING_CPU_THRESHOLD_KEY = 'monitoringCpuThreshold';
export const MONITORING_DISK_THRESHOLD_KEY = 'monitoringDiskThreshold';
export const MONITORING_COOLDOWN_KEY = 'monitoringCooldownMinutes';
export const MONITORING_INTERVAL_KEY = 'monitoringIntervalSeconds';
export const MONITORING_SUSTAIN_KEY = 'monitoringSustainMinutes';
export const MONITORING_ALERT_EMAIL_KEY = 'monitoringAlertEmail';
export const MONITORING_ALERT_PHONE_KEY = 'monitoringAlertPhone';

export const DEFAULT_MONITORING_ENABLED = true;
export const DEFAULT_RAM_THRESHOLD = 80;
export const DEFAULT_CPU_THRESHOLD = 90;
export const DEFAULT_DISK_THRESHOLD = 90;
export const DEFAULT_COOLDOWN_MINUTES = 30;
export const DEFAULT_INTERVAL_SECONDS = 60;
export const DEFAULT_SUSTAIN_MINUTES = 1;

/** How far a metric must fall below its threshold before «بازگشت به حالت عادی» is reported. */
const RECOVERY_HYSTERESIS = 5;

export interface MonitoringConfig {
  enabled: boolean;
  ramThreshold: number;
  cpuThreshold: number;
  diskThreshold: number;
  cooldownMinutes: number;
  intervalSeconds: number;
  sustainMinutes: number;
  alertEmail: string;
  alertPhone: string;
}

export interface MonitoringSnapshot {
  enabled: boolean;
  thresholds: {
    ram: number;
    cpu: number;
    disk: number;
  };
  cooldownMinutes: number;
  intervalSeconds: number;
  sustainMinutes: number;
  recipients: {
    email: string;
    phone: string;
    /** true when the address came from the admin account, not the panel. */
    emailFromAdminAccount: boolean;
    phoneFromAdminAccount: boolean;
  };
  channels: {
    email: boolean;
    sms: boolean;
  };
  current: {
    ramPct: number;
    cpuPct: number;
    diskPct: number;
    totalMemBytes: number;
    freeMemBytes: number;
    cpuCount: number;
    loadAvg: number[];
    uptimeSeconds: number;
    disk: { totalBytes: number; freeBytes: number; usedBytes: number } | null;
    sampledAt: string;
  };
  lastAlerts: Record<'ram' | 'cpu' | 'disk', string | null>;
  alerting: Array<'ram' | 'cpu' | 'disk'>;
}

type MetricKey = 'ram' | 'cpu' | 'disk';

interface CpuTimes {
  idle: number;
  total: number;
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value * 10) / 10));
}

function readCpuTimes(): CpuTimes {
  let idle = 0;
  let total = 0;
  for (const cpu of os.cpus()) {
    const times = cpu.times;
    idle += times.idle;
    total += times.user + times.nice + times.sys + times.idle + times.irq;
  }
  return { idle, total };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Samples the container's RAM, CPU and disk usage and emails/SMSes the admin
 * when a metric crosses its configured threshold.
 *
 * Thresholds and recipients live in the `settings` table so the admin panel can
 * change them without a redeploy; the sampling loop is a plain `setInterval`
 * (no extra scheduler dependency). Alerts are best-effort: a failing SMTP or
 * SMS provider is logged and never breaks the loop.
 */
@Injectable()
export class MonitoringService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MonitoringService.name);
  private timer: NodeJS.Timeout | null = null;
  private ticking = false;
  private intervalSeconds = DEFAULT_INTERVAL_SECONDS;
  private readonly lastAlertAt = new Map<MetricKey, number>();
  private readonly alerting = new Set<MetricKey>();
  /** When each metric first went above its threshold (for the sustain window). */
  private readonly aboveSince = new Map<MetricKey, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly sms: SmsService,
    private readonly notifications: NotificationsService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureDefaults();
      const config = await this.getConfig();
      this.schedule(config.intervalSeconds);
      // First sample shortly after boot so the panel has data immediately.
      setTimeout(() => void this.tick(), 5_000);
    } catch {
      // The settings table may not exist yet on a very first boot.
    }
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private schedule(intervalSeconds: number): void {
    const seconds = Math.max(30, Math.floor(intervalSeconds));
    if (this.timer && seconds === this.intervalSeconds) return;
    this.intervalSeconds = seconds;
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => void this.tick(), seconds * 1000);
  }

  private async ensureDefaults(): Promise<void> {
    const defaults: Array<[string, string]> = [
      [MONITORING_ENABLED_KEY, String(DEFAULT_MONITORING_ENABLED)],
      [MONITORING_RAM_THRESHOLD_KEY, String(DEFAULT_RAM_THRESHOLD)],
      [MONITORING_CPU_THRESHOLD_KEY, String(DEFAULT_CPU_THRESHOLD)],
      [MONITORING_DISK_THRESHOLD_KEY, String(DEFAULT_DISK_THRESHOLD)],
      [MONITORING_COOLDOWN_KEY, String(DEFAULT_COOLDOWN_MINUTES)],
      [MONITORING_INTERVAL_KEY, String(DEFAULT_INTERVAL_SECONDS)],
      [MONITORING_SUSTAIN_KEY, String(DEFAULT_SUSTAIN_MINUTES)],
      [MONITORING_ALERT_EMAIL_KEY, ''],
      [MONITORING_ALERT_PHONE_KEY, ''],
    ];
    await Promise.all(
      defaults.map(([key, value]) =>
        this.prisma.setting.upsert({
          where: { key },
          update: {},
          create: { key, value },
        }),
      ),
    );
  }

  private static toInt(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
  }

  async getConfig(): Promise<MonitoringConfig> {
    const rows = await this.prisma.setting.findMany({
      where: {
        key: {
          in: [
            MONITORING_ENABLED_KEY,
            MONITORING_RAM_THRESHOLD_KEY,
            MONITORING_CPU_THRESHOLD_KEY,
            MONITORING_DISK_THRESHOLD_KEY,
            MONITORING_COOLDOWN_KEY,
            MONITORING_INTERVAL_KEY,
            MONITORING_SUSTAIN_KEY,
            MONITORING_ALERT_EMAIL_KEY,
            MONITORING_ALERT_PHONE_KEY,
          ],
        },
      },
    });
    const byKey = new Map(rows.map((row) => [row.key, row.value]));
    return {
      enabled:
        (byKey.get(MONITORING_ENABLED_KEY) ?? String(DEFAULT_MONITORING_ENABLED)) !==
        'false',
      ramThreshold: MonitoringService.toInt(
        byKey.get(MONITORING_RAM_THRESHOLD_KEY),
        DEFAULT_RAM_THRESHOLD,
      ),
      cpuThreshold: MonitoringService.toInt(
        byKey.get(MONITORING_CPU_THRESHOLD_KEY),
        DEFAULT_CPU_THRESHOLD,
      ),
      diskThreshold: MonitoringService.toInt(
        byKey.get(MONITORING_DISK_THRESHOLD_KEY),
        DEFAULT_DISK_THRESHOLD,
      ),
      cooldownMinutes: MonitoringService.toInt(
        byKey.get(MONITORING_COOLDOWN_KEY),
        DEFAULT_COOLDOWN_MINUTES,
      ),
      intervalSeconds: MonitoringService.toInt(
        byKey.get(MONITORING_INTERVAL_KEY),
        DEFAULT_INTERVAL_SECONDS,
      ),
      sustainMinutes: MonitoringService.toInt(
        byKey.get(MONITORING_SUSTAIN_KEY),
        DEFAULT_SUSTAIN_MINUTES,
      ),
      alertEmail: byKey.get(MONITORING_ALERT_EMAIL_KEY) ?? '',
      alertPhone: byKey.get(MONITORING_ALERT_PHONE_KEY) ?? '',
    };
  }

  async updateConfig(dto: UpdateMonitoringDto): Promise<MonitoringSnapshot> {
    const entries: Array<[string, string | undefined]> = [
      [MONITORING_ENABLED_KEY, dto.enabled === undefined ? undefined : dto.enabled ? 'true' : 'false'],
      [MONITORING_RAM_THRESHOLD_KEY, dto.ramThreshold?.toString()],
      [MONITORING_CPU_THRESHOLD_KEY, dto.cpuThreshold?.toString()],
      [MONITORING_DISK_THRESHOLD_KEY, dto.diskThreshold?.toString()],
      [MONITORING_COOLDOWN_KEY, dto.cooldownMinutes?.toString()],
      [MONITORING_INTERVAL_KEY, dto.intervalSeconds?.toString()],
      [MONITORING_SUSTAIN_KEY, dto.sustainMinutes?.toString()],
      [MONITORING_ALERT_EMAIL_KEY, dto.alertEmail?.trim()],
      [MONITORING_ALERT_PHONE_KEY, dto.alertPhone?.trim()],
    ];
    const writes = entries.filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    );
    await Promise.all(
      writes.map(([key, value]) =>
        this.prisma.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        }),
      ),
    );
    const config = await this.getConfig();
    this.schedule(config.intervalSeconds);
    return this.getSnapshot();
  }

  /** Current usage + configuration, for the admin panel. */
  async getSnapshot(): Promise<MonitoringSnapshot> {
    const [config, metrics, recipients] = await Promise.all([
      this.getConfig(),
      this.sample(),
      this.resolveRecipients(),
    ]);
    const lastAlerts = { ram: null, cpu: null, disk: null } as Record<
      MetricKey,
      string | null
    >;
    for (const [key, at] of this.lastAlertAt) {
      lastAlerts[key] = new Date(at).toISOString();
    }
    return {
      enabled: config.enabled,
      thresholds: {
        ram: config.ramThreshold,
        cpu: config.cpuThreshold,
        disk: config.diskThreshold,
      },
      cooldownMinutes: config.cooldownMinutes,
      intervalSeconds: config.intervalSeconds,
      sustainMinutes: config.sustainMinutes,
      recipients: {
        email: recipients.email,
        phone: recipients.phone,
        emailFromAdminAccount: recipients.emailFromAdminAccount,
        phoneFromAdminAccount: recipients.phoneFromAdminAccount,
      },
      channels: {
        email: this.mail.enabled,
        sms: this.sms.textEnabled,
      },
      current: metrics,
      lastAlerts,
      alerting: [...this.alerting],
    };
  }

  /**
   * Where alerts go: the panel value wins, then the env var, then the oldest
   * active ADMIN account (so a fresh install still reaches someone).
   */
  private async resolveRecipients(): Promise<{
    email: string;
    phone: string;
    emailFromAdminAccount: boolean;
    phoneFromAdminAccount: boolean;
  }> {
    const config = await this.getConfig();
    let email = config.alertEmail || process.env.MONITORING_ALERT_EMAIL?.trim() || '';
    let phone = config.alertPhone || process.env.MONITORING_ALERT_PHONE?.trim() || '';
    let emailFromAdminAccount = false;
    let phoneFromAdminAccount = false;
    if (!email || !phone) {
      const admin = await this.prisma.user.findFirst({
        where: { role: 'ADMIN', isActive: true },
        orderBy: { createdAt: 'asc' },
        select: { email: true, phone: true },
      });
      if (!email && admin?.email) {
        email = admin.email;
        emailFromAdminAccount = true;
      }
      if (!phone && admin?.phone) {
        phone = admin.phone;
        phoneFromAdminAccount = true;
      }
    }
    return { email, phone, emailFromAdminAccount, phoneFromAdminAccount };
  }

  private async sample(): Promise<MonitoringSnapshot['current']> {
    const before = readCpuTimes();
    await sleep(400);
    const after = readCpuTimes();
    const idleDelta = after.idle - before.idle;
    const totalDelta = after.total - before.total;
    const cpuPct =
      totalDelta > 0 ? clampPct((1 - idleDelta / totalDelta) * 100) : 0;

    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();
    const ramPct =
      totalMemBytes > 0
        ? clampPct(((totalMemBytes - freeMemBytes) / totalMemBytes) * 100)
        : 0;

    const disk = await this.diskStats();
    const diskPct =
      disk && disk.totalBytes > 0
        ? clampPct((disk.usedBytes / disk.totalBytes) * 100)
        : 0;

    return {
      ramPct,
      cpuPct,
      diskPct,
      totalMemBytes,
      freeMemBytes,
      cpuCount: os.cpus().length,
      loadAvg: os.loadavg(),
      uptimeSeconds: Math.round(os.uptime()),
      disk,
      sampledAt: new Date().toISOString(),
    };
  }

  private async diskStats(): Promise<
    { totalBytes: number; freeBytes: number; usedBytes: number } | null
  > {
    try {
      const stats = await statfs('/');
      const totalBytes = Number(stats.blocks) * Number(stats.bsize);
      const freeBytes = Number(stats.bavail) * Number(stats.bsize);
      return {
        totalBytes,
        freeBytes,
        usedBytes: Math.max(0, totalBytes - freeBytes),
      };
    } catch {
      return null;
    }
  }

  /** One sampling pass: evaluate thresholds and fire alerts. */
  async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const config = await this.getConfig();
      this.schedule(config.intervalSeconds);
      if (!config.enabled) return;

      const metrics = await this.sample();
      const values: Record<MetricKey, number> = {
        ram: metrics.ramPct,
        cpu: metrics.cpuPct,
        disk: metrics.diskPct,
      };
      const thresholds: Record<MetricKey, number> = {
        ram: config.ramThreshold,
        cpu: config.cpuThreshold,
        disk: config.diskThreshold,
      };
      const labels: Record<MetricKey, string> = {
        ram: 'حافظه (RAM)',
        cpu: 'پردازنده (CPU)',
        disk: 'فضای دیسک',
      };
      const now = Date.now();
      const cooldownMs = Math.max(5, config.cooldownMinutes) * 60_000;
      const sustainMs = Math.max(0, config.sustainMinutes) * 60_000;

      for (const key of ['ram', 'cpu', 'disk'] as MetricKey[]) {
        const value = values[key];
        const threshold = thresholds[key];
        const last = this.lastAlertAt.get(key) ?? 0;

        if (value >= threshold) {
          // Wait until the metric has stayed above the threshold for the
          // configured window before alerting (e.g. RAM > 80% for 1 minute).
          const since = this.aboveSince.get(key);
          if (since === undefined) {
            this.aboveSince.set(key, now);
            if (sustainMs > 0) continue;
          } else if (now - since < sustainMs) {
            continue;
          }
          if (now - last < cooldownMs) continue;
          this.lastAlertAt.set(key, now);
          this.alerting.add(key);
          await this.dispatch(
            `هشدار منابع سرور — ${labels[key]}`,
            `مصرف ${labels[key]} به ${value}٪ رسید و بیش از ` +
              `${config.sustainMinutes.toLocaleString('fa-IR')} دقیقه بالاتر از آستانه‌ی ` +
              `${threshold}٪ ماند.\n` +
              `زمان: ${new Date(now).toLocaleString('fa-IR')}\n` +
              `لطفاً وضعیت سرور را بررسی کنید.`,
            key,
            value,
          );
        } else {
          this.aboveSince.delete(key);
          if (
            this.alerting.has(key) &&
            value < threshold - RECOVERY_HYSTERESIS
          ) {
            this.alerting.delete(key);
            this.lastAlertAt.delete(key);
            await this.dispatch(
              `بازگشت به حالت عادی — ${labels[key]}`,
              `مصرف ${labels[key]} به ${value}٪ کاهش یافت و از آستانه‌ی ${threshold}٪ پایین‌تر آمد.`,
              key,
              value,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Monitoring tick failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    } finally {
      this.ticking = false;
    }
  }

  private async dispatch(
    subject: string,
    body: string,
    metric: MetricKey,
    value: number,
  ): Promise<void> {
    const recipients = await this.resolveRecipients();
    const tasks: Array<Promise<unknown>> = [];
    if (recipients.email) {
      tasks.push(this.mail.sendAlert(recipients.email, subject, body));
    }
    if (recipients.phone) {
      tasks.push(this.sms.sendText(recipients.phone, `${subject}\n${body}`));
    }
    tasks.push(
      this.notifications.notifyAdmins({
        category: 'SYSTEM',
        title: subject,
        body,
        link: '/jga4rm8j?section=monitoring',
        // Monitoring already sends its own detailed SMS above.
        skipSms: true,
      }),
    );
    // Each transport already swallows its own errors; allSettled guards the rest.
    await Promise.allSettled(tasks);
    this.logger.warn(`Monitoring alert dispatched (${metric}=${value}%)`);
  }

  /** Sends a test message through every configured channel. */
  async sendTest(): Promise<{ email: boolean; sms: boolean }> {
    const recipients = await this.resolveRecipients();
    const subject = 'پیام آزمایشی پایش منابع سرور';
    const body =
      'این یک پیام آزمایشی از سامانه‌ی پایش منابع شمالی کارت است. ' +
      'اگر آن را دریافت کردید، کانال هشدار به‌درستی تنظیم شده است.';
    const [email, sms] = await Promise.all([
      recipients.email
        ? this.mail.sendAlert(recipients.email, subject, body)
        : Promise.resolve(false),
      recipients.phone
        ? this.sms.sendText(recipients.phone, `${subject}\n${body}`)
        : Promise.resolve(false),
    ]);
    return { email, sms };
  }
}
