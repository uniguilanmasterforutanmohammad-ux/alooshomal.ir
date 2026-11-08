'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  HardDrive,
  Mail,
  MemoryStick,
  RefreshCw,
  Save,
  Send,
  Smartphone,
} from 'lucide-react';

import { api } from '@/lib/api';

interface MonitoringSnapshot {
  enabled: boolean;
  thresholds: { ram: number; cpu: number; disk: number };
  cooldownMinutes: number;
  intervalSeconds: number;
  sustainMinutes: number;
  recipients: {
    email: string;
    phone: string;
    emailFromAdminAccount: boolean;
    phoneFromAdminAccount: boolean;
  };
  channels: { email: boolean; sms: boolean };
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

interface FormState {
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

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '۰';
  const units = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت', 'ترابایت'];
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / Math.pow(1024, exponent);
  const rounded = exponent === 0 ? value : Math.round(value * 10) / 10;
  return `${rounded.toLocaleString('fa-IR')} ${units[exponent]}`;
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fa-IR');
  } catch {
    return iso;
  }
}

function gaugeColor(value: number, threshold: number): string {
  if (value >= Math.min(100, threshold + 10)) return '#b91c1c';
  if (value >= threshold) return '#d97706';
  return '#1f7a4d';
}

function Gauge({
  label,
  icon: Icon,
  value,
  threshold,
  detail,
}: {
  label: string;
  icon: typeof Cpu;
  value: number;
  threshold: number;
  detail: string;
}) {
  const color = gaugeColor(value, threshold);
  const width = Math.min(100, Math.max(0, value));
  return (
    <div className="rounded-xl border border-[var(--vintage-border)] p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-bold text-ink">
          <Icon className="size-4 text-brand" aria-hidden />
          {label}
        </span>
        <span className="text-lg font-extrabold" style={{ color }}>
          {value.toLocaleString('fa-IR')}٪
        </span>
      </div>
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[var(--vintage-border)]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
        <span>آستانه: {threshold.toLocaleString('fa-IR')}٪</span>
        <span>{detail}</span>
      </div>
    </div>
  );
}

/**
 * Server resource monitor: live RAM/CPU/disk usage plus the thresholds and
 * alert recipients the admin can edit. When a metric crosses its threshold the
 * API emails and texts the recipients (and drops an in-app admin notification).
 */
export function AdminMonitoringPanel() {
  const [snapshot, setSnapshot] = useState<MonitoringSnapshot | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const applySnapshot = useCallback((data: MonitoringSnapshot) => {
    setSnapshot(data);
    setForm({
      enabled: data.enabled,
      ramThreshold: data.thresholds.ram,
      cpuThreshold: data.thresholds.cpu,
      diskThreshold: data.thresholds.disk,
      cooldownMinutes: data.cooldownMinutes,
      intervalSeconds: data.intervalSeconds,
      sustainMinutes: data.sustainMinutes,
      alertEmail: data.recipients.emailFromAdminAccount ? '' : data.recipients.email,
      alertPhone: data.recipients.phoneFromAdminAccount ? '' : data.recipients.phone,
    });
  }, []);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const data = await api.get<MonitoringSnapshot>('/admin/monitoring');
        applySnapshot(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'خطا در بارگذاری وضعیت منابع');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [applySnapshot],
  );

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(true), 30_000);
    return () => clearInterval(timer);
  }, [load]);

  async function save() {
    if (!form) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const data = await api.patch<MonitoringSnapshot>('/admin/monitoring', form);
      applySnapshot(data);
      setMessage('تنظیمات پایش ذخیره شد.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره تنظیمات ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.post<{ email: boolean; sms: boolean }>(
        '/admin/monitoring/test',
      );
      const parts: string[] = [];
      parts.push(result.email ? 'ایمیل ارسال شد' : 'ایمیل ارسال نشد');
      parts.push(result.sms ? 'پیامک ارسال شد' : 'پیامک ارسال نشد');
      setMessage(`پیام آزمایشی: ${parts.join(' — ')}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ارسال پیام آزمایشی ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  if (loading && !snapshot) {
    return (
      <div className="indeed-panel p-6 text-center text-sm text-muted">
        در حال خواندن وضعیت منابع سرور...
      </div>
    );
  }

  if (!snapshot || !form) {
    return (
      <div className="indeed-panel p-6">
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error ?? 'وضعیت منابع در دسترس نیست.'}
        </p>
        <button
          onClick={() => void load()}
          className="indeed-btn indeed-btn-secondary mt-3 py-2 text-sm"
        >
          <RefreshCw className="size-4" aria-hidden />
          تلاش مجدد
        </button>
      </div>
    );
  }

  const current = snapshot.current;
  const memUsed = Math.max(0, current.totalMemBytes - current.freeMemBytes);
  const anyAlerting = snapshot.alerting.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Activity className="size-4" aria-hidden />
          نمونه‌برداری: {formatTime(current.sampledAt)} — هر{' '}
          {snapshot.intervalSeconds.toLocaleString('fa-IR')} ثانیه
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            className="indeed-btn indeed-btn-secondary py-2 text-sm"
            disabled={busy}
          >
            <RefreshCw className="size-4" aria-hidden />
            به‌روزرسانی
          </button>
        </div>
      </div>

      {anyAlerting ? (
        <p className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="size-4" aria-hidden />
          هم‌اکنون مصرف یکی از منابع بالاتر از آستانه است و هشدار فعال شده است.
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <Gauge
          label="حافظه (RAM)"
          icon={MemoryStick}
          value={current.ramPct}
          threshold={snapshot.thresholds.ram}
          detail={`${formatBytes(memUsed)} از ${formatBytes(current.totalMemBytes)}`}
        />
        <Gauge
          label="پردازنده (CPU)"
          icon={Cpu}
          value={current.cpuPct}
          threshold={snapshot.thresholds.cpu}
          detail={`${current.cpuCount.toLocaleString('fa-IR')} هسته`}
        />
        <Gauge
          label="فضای دیسک"
          icon={HardDrive}
          value={current.diskPct}
          threshold={snapshot.thresholds.disk}
          detail={
            current.disk
              ? `${formatBytes(current.disk.usedBytes)} از ${formatBytes(current.disk.totalBytes)}`
              : 'نامشخص'
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="indeed-panel p-5">
          <h3 className="flex items-center gap-2 font-extrabold text-ink">
            <AlertTriangle className="size-5 text-brand" aria-hidden />
            آستانه‌های هشدار
          </h3>
          <p className="mt-1 text-sm text-muted">
            وقتی مصرف هر منبع به این درصد برسد و به مدت تعیین‌شده بالای آن بماند،
            هشدار برای گیرندگان ارسال می‌شود.
          </p>

          <label className="mt-4 flex items-start gap-3 rounded-lg border border-[var(--vintage-border)] p-3">
            <input
              type="checkbox"
              className="mt-1 size-4"
              checked={form.enabled}
              disabled={busy}
              onChange={(event) =>
                setForm({ ...form, enabled: event.target.checked })
              }
            />
            <span>
              <span className="block text-sm font-bold text-ink">
                پایش خودکار فعال باشد
              </span>
              <span className="block text-xs text-muted">
                با خاموش بودن، منابع نمایش داده می‌شوند ولی هشدار ارسال نمی‌شود.
              </span>
            </span>
          </label>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-semibold text-ink">
              رم (٪)
              <input
                type="number"
                min={1}
                max={100}
                className="indeed-input mt-1"
                value={form.ramThreshold}
                disabled={busy}
                onChange={(event) =>
                  setForm({ ...form, ramThreshold: Number(event.target.value) })
                }
              />
            </label>
            <label className="text-sm font-semibold text-ink">
              پردازنده (٪)
              <input
                type="number"
                min={1}
                max={100}
                className="indeed-input mt-1"
                value={form.cpuThreshold}
                disabled={busy}
                onChange={(event) =>
                  setForm({ ...form, cpuThreshold: Number(event.target.value) })
                }
              />
            </label>
            <label className="text-sm font-semibold text-ink">
              دیسک (٪)
              <input
                type="number"
                min={1}
                max={100}
                className="indeed-input mt-1"
                value={form.diskThreshold}
                disabled={busy}
                onChange={(event) =>
                  setForm({ ...form, diskThreshold: Number(event.target.value) })
                }
              />
            </label>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-ink">
              مدت ماندگاری بالای آستانه (دقیقه)
              <input
                type="number"
                min={0}
                max={120}
                className="indeed-input mt-1"
                value={form.sustainMinutes}
                disabled={busy}
                onChange={(event) =>
                  setForm({ ...form, sustainMinutes: Number(event.target.value) })
                }
              />
            </label>
            <label className="text-sm font-semibold text-ink">
              تکرار هشدار (دقیقه)
              <input
                type="number"
                min={5}
                max={1440}
                className="indeed-input mt-1"
                value={form.cooldownMinutes}
                disabled={busy}
                onChange={(event) =>
                  setForm({ ...form, cooldownMinutes: Number(event.target.value) })
                }
              />
            </label>
            <label className="text-sm font-semibold text-ink">
              فاصله‌ی نمونه‌برداری (ثانیه)
              <input
                type="number"
                min={30}
                max={3600}
                className="indeed-input mt-1"
                value={form.intervalSeconds}
                disabled={busy}
                onChange={(event) =>
                  setForm({ ...form, intervalSeconds: Number(event.target.value) })
                }
              />
            </label>
          </div>
        </section>

        <section className="indeed-panel p-5">
          <h3 className="flex items-center gap-2 font-extrabold text-ink">
            <Send className="size-5 text-brand" aria-hidden />
            گیرندگان هشدار
          </h3>
          <p className="mt-1 text-sm text-muted">
            خالی گذاشتن هر مورد یعنی استفاده از ایمیل/موبایل ادمین اصلی.
          </p>

          <label className="mt-4 block text-sm font-semibold text-ink">
            <span className="flex items-center gap-1.5">
              <Mail className="size-4 text-brand" aria-hidden />
              ایمیل
            </span>
            <input
              type="email"
              dir="ltr"
              className="indeed-input mt-1"
              placeholder={snapshot.recipients.email || 'admin@example.com'}
              value={form.alertEmail}
              disabled={busy}
              onChange={(event) =>
                setForm({ ...form, alertEmail: event.target.value })
              }
            />
          </label>

          <label className="mt-3 block text-sm font-semibold text-ink">
            <span className="flex items-center gap-1.5">
              <Smartphone className="size-4 text-brand" aria-hidden />
              موبایل
            </span>
            <input
              type="tel"
              dir="ltr"
              className="indeed-input mt-1"
              placeholder={snapshot.recipients.phone || '09xxxxxxxxx'}
              value={form.alertPhone}
              disabled={busy}
              onChange={(event) =>
                setForm({ ...form, alertPhone: event.target.value })
              }
            />
          </label>

          <div className="mt-4 flex flex-col gap-2 text-xs">
            <span
              className={`flex items-center gap-1.5 ${
                snapshot.channels.email ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {snapshot.channels.email ? (
                <CheckCircle2 className="size-4" aria-hidden />
              ) : (
                <AlertTriangle className="size-4" aria-hidden />
              )}
              {snapshot.channels.email
                ? 'ارسال ایمیل (SMTP) تنظیم شده است.'
                : 'SMTP تنظیم نشده؛ ایمیل ارسال نمی‌شود.'}
            </span>
            <span
              className={`flex items-center gap-1.5 ${
                snapshot.channels.sms ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {snapshot.channels.sms ? (
                <CheckCircle2 className="size-4" aria-hidden />
              ) : (
                <AlertTriangle className="size-4" aria-hidden />
              )}
              {snapshot.channels.sms
                ? 'ارسال پیامک تنظیم شده است.'
                : 'MELIPAYAMAK_SMS_PATH تنظیم نشده؛ پیامک ارسال نمی‌شود.'}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => void save()}
              className="indeed-btn indeed-btn-primary py-2 text-sm"
              disabled={busy}
            >
              <Save className="size-4" aria-hidden />
              ذخیره تنظیمات
            </button>
            <button
              onClick={() => void sendTest()}
              className="indeed-btn indeed-btn-secondary py-2 text-sm"
              disabled={busy}
            >
              <Send className="size-4" aria-hidden />
              ارسال پیام آزمایشی
            </button>
          </div>
        </section>
      </div>

      <section className="indeed-panel p-5">
        <h3 className="font-extrabold text-ink">آخرین هشدارها</h3>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          {(['ram', 'cpu', 'disk'] as const).map((key) => (
            <div
              key={key}
              className="rounded-lg border border-[var(--vintage-border)] p-3"
            >
              <p className="text-xs text-muted">
                {key === 'ram' ? 'رم' : key === 'cpu' ? 'پردازنده' : 'دیسک'}
              </p>
              <p className="mt-1 font-semibold text-ink">
                {formatTime(snapshot.lastAlerts[key])}
              </p>
            </div>
          ))}
        </div>
      </section>

      {message ? (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
