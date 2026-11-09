'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  FlaskConical,
  Loader2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

interface ZohalField {
  name: string;
  label: string;
  required?: boolean;
  type?: 'text' | 'date' | 'boolean' | 'file';
  placeholder?: string;
}

interface ZohalService {
  key: string;
  label: string;
  group: string;
  description: string;
  method: 'POST' | 'GET';
  path: string;
  pathParams?: string[];
  fields: ZohalField[];
  enabled: boolean;
  price: number;
}

interface ZohalStatus {
  configured: boolean;
  baseUrl: string;
  enabledCount: number;
  total: number;
}

interface ZohalServicesResponse {
  status: ZohalStatus;
  services: ZohalService[];
}

interface ZohalCallResult {
  ok: boolean;
  result: number | null;
  message: string;
  errorCode: string | null;
  data: unknown;
  httpStatus: number | null;
  latencyMs: number;
}

interface BlueTickUser {
  id: string;
  fullName: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  nationalCode?: string | null;
  birthDate?: string | null;
  blueTickRequestedAt?: string | null;
  verifiedAt?: string | null;
  blueTickNote?: string | null;
}

interface BlueTickResponse {
  pending: BlueTickUser[];
  verified: BlueTickUser[];
}

function faDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fa-IR');
}

/**
 * Admin «زحل» panel: lists every Zohal web service (from the official OpenAPI
 * spec), lets the admin switch each one on/off, run an explicit test call and
 * review blue-tick requests. Real calls are billed to the Zohal wallet, so the
 * test button is clearly marked as a paid call.
 */
export function AdminZohal() {
  const [data, setData] = useState<ZohalServicesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [testKey, setTestKey] = useState<string | null>(null);
  const [testPayload, setTestPayload] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<ZohalCallResult | null>(null);
  const [blueTick, setBlueTick] = useState<BlueTickResponse | null>(null);
  const [blueTickBusy, setBlueTickBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [services, requests] = await Promise.all([
        api.get<ZohalServicesResponse>('/admin/zohal/services'),
        api.get<BlueTickResponse>('/admin/zohal/blue-tick'),
      ]);
      setData(services);
      setPriceInputs(
        Object.fromEntries(
          services.services.map((service) => [service.key, String(service.price)]),
        ),
      );
      setBlueTick(requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'بارگذاری سرویس‌های زحل ناموفق بود');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => {
    const map = new Map<string, ZohalService[]>();
    for (const service of data?.services ?? []) {
      const list = map.get(service.group) ?? [];
      list.push(service);
      map.set(service.group, list);
    }
    return [...map.entries()];
  }, [data]);

  async function toggle(service: ZohalService) {
    setBusyKey(service.key);
    try {
      await api.patch(`/admin/zohal/services/${service.key}`, {
        enabled: !service.enabled,
      });
      setData((current) =>
        current
          ? {
              ...current,
              services: current.services.map((item) =>
                item.key === service.key ? { ...item, enabled: !item.enabled } : item,
              ),
            }
          : current,
      );
      toast.success(
        `سرویس «${service.label}» ${service.enabled ? 'غیرفعال' : 'فعال'} شد.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تغییر وضعیت سرویس ناموفق بود');
    } finally {
      setBusyKey(null);
    }
  }

  async function savePrice(service: ZohalService) {
    const raw = (priceInputs[service.key] ?? '').trim();
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) {
      toast.error('هزینه باید یک عدد نامنفی باشد.');
      return;
    }
    setBusyKey(service.key);
    try {
      const result = await api.patch<{ price: number }>(
        `/admin/zohal/services/${service.key}`,
        { price: Math.floor(value) },
      );
      setData((current) =>
        current
          ? {
              ...current,
              services: current.services.map((item) =>
                item.key === service.key
                  ? { ...item, price: result.price }
                  : item,
              ),
            }
          : current,
      );
      setPriceInputs((current) => ({
        ...current,
        [service.key]: String(result.price),
      }));
      toast.success(`هزینه سرویس «${service.label}» ثبت شد.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ثبت هزینه ناموفق بود');
    } finally {
      setBusyKey(null);
    }
  }

  function openTest(service: ZohalService) {
    if (testKey === service.key) {
      setTestKey(null);
      return;
    }
    setTestKey(service.key);
    setTestResult(null);
    const initial: Record<string, string> = {};
    for (const field of service.fields) initial[field.name] = '';
    setTestPayload(initial);
  }

  async function runTest(service: ZohalService) {
    const payload: Record<string, unknown> = {};
    for (const field of service.fields) {
      const raw = testPayload[field.name]?.trim();
      if (!raw) continue;
      payload[field.name] = field.type === 'boolean' ? raw === 'true' : raw;
    }
    for (const param of service.pathParams ?? []) {
      if (!payload[param]) {
        toast.error(`پارامتر «${param}» الزامی است`);
        return;
      }
    }
    setBusyKey(service.key);
    setTestResult(null);
    try {
      const result = await api.post<ZohalCallResult>(
        `/admin/zohal/services/${service.key}/test`,
        { payload },
      );
      setTestResult(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فراخوانی آزمایشی ناموفق بود');
    } finally {
      setBusyKey(null);
    }
  }

  async function decide(user: BlueTickUser, decision: 'APPROVED' | 'REJECTED') {
    setBlueTickBusy(user.id);
    try {
      await api.patch(`/admin/zohal/blue-tick/${user.id}`, { decision });
      toast.success(decision === 'APPROVED' ? 'تیک آبی تأیید شد.' : 'درخواست رد شد.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ثبت تصمیم ناموفق بود');
    } finally {
      setBlueTickBusy(null);
    }
  }

  if (loading && !data) {
    return <p className="text-sm text-muted">در حال بارگذاری سرویس‌های زحل...</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="indeed-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-brand" aria-hidden />
            <h2 className="text-sm font-extrabold text-ink">اتصال سرویس زحل</h2>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="indeed-btn indeed-btn-secondary py-1 text-xs"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            بروزرسانی
          </button>
        </div>
        <div className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
          <div className="rounded-lg border border-line bg-surface p-3">
            <p className="text-muted">وضعیت توکن</p>
            <p className={cn('mt-1 font-bold', data?.status.configured ? 'text-emerald-700' : 'text-red-700')}>
              {data?.status.configured ? 'تنظیم شده' : 'تنظیم نشده'}
            </p>
          </div>
          <div className="rounded-lg border border-line bg-surface p-3">
            <p className="text-muted">آدرس سرویس</p>
            <p className="mt-1 font-bold text-ink" dir="ltr">{data?.status.baseUrl ?? '—'}</p>
          </div>
          <div className="rounded-lg border border-line bg-surface p-3">
            <p className="text-muted">سرویس‌های فعال</p>
            <p className="mt-1 font-bold text-ink">
              {data?.status.enabledCount ?? 0} از {data?.status.total ?? 0}
            </p>
          </div>
        </div>
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-6 text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          هر فراخوانی واقعی زحل از کیف پول حساب کسر می‌شود. دکمه‌ی «آزمایش» یک
          درخواست واقعی است؛ فقط هنگام نیاز از آن استفاده کنید.
        </p>
      </div>

      <div className="indeed-panel p-5">
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink">
          <BadgeCheck className="size-4 text-sky-600" aria-hidden />
          درخواست‌های تیک آبی
        </h2>
        {blueTick && blueTick.pending.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="text-muted">
                  <th className="border-b border-line p-2 text-right">کاربر</th>
                  <th className="border-b border-line p-2 text-right">موبایل</th>
                  <th className="border-b border-line p-2 text-right">کد ملی</th>
                  <th className="border-b border-line p-2 text-right">تاریخ تولد</th>
                  <th className="border-b border-line p-2 text-right">تاریخ درخواست</th>
                  <th className="border-b border-line p-2 text-right">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {blueTick.pending.map((user) => (
                  <tr key={user.id}>
                    <td className="border-b border-line p-2 font-bold text-ink">
                      {user.fullName ?? '—'}
                    </td>
                    <td className="border-b border-line p-2" dir="ltr">{user.phone ?? '—'}</td>
                    <td className="border-b border-line p-2" dir="ltr">{user.nationalCode ?? '—'}</td>
                    <td className="border-b border-line p-2">{user.birthDate ?? '—'}</td>
                    <td className="border-b border-line p-2">{faDate(user.blueTickRequestedAt)}</td>
                    <td className="border-b border-line p-2">
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          disabled={blueTickBusy === user.id}
                          onClick={() => void decide(user, 'APPROVED')}
                          className="indeed-btn indeed-btn-primary py-1 text-[11px]"
                        >
                          <CheckCircle2 className="size-3.5" aria-hidden />
                          تأیید
                        </button>
                        <button
                          type="button"
                          disabled={blueTickBusy === user.id}
                          onClick={() => void decide(user, 'REJECTED')}
                          className="indeed-btn indeed-btn-secondary py-1 text-[11px] text-red-700"
                        >
                          <XCircle className="size-3.5" aria-hidden />
                          رد
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted">درخواست تیک آبی در انتظار بررسی نیست.</p>
        )}
        {blueTick && blueTick.verified.length > 0 ? (
          <p className="mt-3 text-[11px] text-muted">
            آخرین حساب‌های دارای تیک آبی:{' '}
            {blueTick.verified
              .slice(0, 8)
              .map((user) => user.fullName ?? '—')
              .join('، ')}
          </p>
        ) : null}
      </div>

      {groups.map(([group, services]) => (
        <div key={group} className="indeed-panel p-5">
          <h2 className="text-sm font-extrabold text-ink">{group}</h2>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {services.map((service) => {
              const hasFile = service.fields.some((field) => field.type === 'file');
              return (
                <div key={service.key} className="rounded-xl border border-line bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-ink">{service.label}</p>
                      <p className="mt-1 text-[11px] leading-5 text-muted">{service.description}</p>
                      <p className="mt-1 font-mono text-[10px] text-muted" dir="ltr">
                        {service.method} {service.path}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyKey === service.key}
                      onClick={() => void toggle(service)}
                      className={cn(
                        'shrink-0 rounded-full px-3 py-1 text-[11px] font-bold',
                        service.enabled
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600',
                      )}
                    >
                      {service.enabled ? 'فعال' : 'غیرفعال'}
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-line bg-background p-2">
                    <label className="text-[11px] font-bold text-muted">
                      هزینه‌ی هر استعلام برای کاربر (تومان)
                      <input
                        className="indeed-input mt-1 w-36 py-1 text-xs"
                        dir="ltr"
                        inputMode="numeric"
                        value={priceInputs[service.key] ?? ''}
                        onChange={(event) =>
                          setPriceInputs((current) => ({
                            ...current,
                            [service.key]: event.target.value.replace(/\D/g, ''),
                          }))
                        }
                      />
                    </label>
                    <button
                      type="button"
                      disabled={busyKey === service.key}
                      onClick={() => void savePrice(service)}
                      className="indeed-btn indeed-btn-secondary py-1 text-[11px]"
                    >
                      ثبت هزینه
                    </button>
                    <span className="text-[11px] text-muted">
                      فعلی:{' '}
                      {service.price > 0
                        ? `${service.price.toLocaleString('fa-IR')} تومان`
                        : 'رایگان'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => openTest(service)}
                    className="indeed-btn indeed-btn-secondary mt-3 py-1 text-[11px]"
                  >
                    <FlaskConical className="size-3.5" aria-hidden />
                    آزمایش (هزینه‌زا)
                  </button>

                  {testKey === service.key ? (
                    <div className="mt-3 rounded-lg border border-line bg-background p-3">
                      {hasFile ? (
                        <p className="text-[11px] text-amber-700">
                          این سرویس فایل/مدیا می‌خواهد و از این فرم قابل آزمایش نیست.
                        </p>
                      ) : (
                        <>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {service.fields.map((field) => (
                              <label key={field.name} className="text-[11px] font-bold text-muted">
                                {field.label}
                                {field.required ? ' *' : ''}
                                {field.type === 'boolean' ? (
                                  <select
                                    className="indeed-input mt-1 py-1 text-xs"
                                    value={testPayload[field.name] ?? ''}
                                    onChange={(event) =>
                                      setTestPayload((current) => ({
                                        ...current,
                                        [field.name]: event.target.value,
                                      }))
                                    }
                                  >
                                    <option value="">—</option>
                                    <option value="true">بله</option>
                                    <option value="false">خیر</option>
                                  </select>
                                ) : (
                                  <input
                                    className="indeed-input mt-1 py-1 text-xs"
                                    dir={field.type === 'date' ? 'ltr' : undefined}
                                    placeholder={field.placeholder}
                                    value={testPayload[field.name] ?? ''}
                                    onChange={(event) =>
                                      setTestPayload((current) => ({
                                        ...current,
                                        [field.name]: event.target.value,
                                      }))
                                    }
                                  />
                                )}
                              </label>
                            ))}
                          </div>
                          <button
                            type="button"
                            disabled={busyKey === service.key}
                            onClick={() => void runTest(service)}
                            className="indeed-btn indeed-btn-primary mt-3 py-1 text-[11px]"
                          >
                            {busyKey === service.key ? (
                              <Loader2 className="size-3.5 animate-spin" aria-hidden />
                            ) : (
                              <FlaskConical className="size-3.5" aria-hidden />
                            )}
                            ارسال درخواست آزمایشی
                          </button>
                        </>
                      )}

                      {testKey === service.key && testResult ? (
                        <div className="mt-3">
                          <p
                            className={cn(
                              'text-[11px] font-bold',
                              testResult.ok ? 'text-emerald-700' : 'text-red-700',
                            )}
                          >
                            {testResult.ok ? 'موفق' : 'ناموفق'} — {testResult.message}
                            {testResult.errorCode ? ` (${testResult.errorCode})` : ''}
                            {testResult.httpStatus ? ` — HTTP ${testResult.httpStatus}` : ''}
                            {` — ${testResult.latencyMs}ms`}
                          </p>
                          <pre
                            dir="ltr"
                            className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-900 p-2 text-[10px] text-slate-100"
                          >
                            {JSON.stringify(testResult.data, null, 2)}
                          </pre>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
