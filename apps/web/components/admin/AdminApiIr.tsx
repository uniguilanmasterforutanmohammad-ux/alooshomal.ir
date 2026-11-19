'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  FlaskConical,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

interface ApiIrField {
  name: string;
  label: string;
  required?: boolean;
  type?: 'text' | 'date' | 'boolean' | 'file';
  placeholder?: string;
}

interface ApiIrServiceItem {
  key: string;
  label: string;
  group: string;
  description: string;
  method: 'POST' | 'GET';
  path: string;
  fields: ApiIrField[];
  enabled: boolean;
  price: number;
  /** Official api.ir tariff for one call (Toman); 0/undefined = not recorded. */
  tariff?: number;
  /** PayPing product mirrored for this service (null until synced). */
  payping?: { code: string; amount: number | null } | null;
}

interface ApiIrStatus {
  configured: boolean;
  simulated: boolean;
  baseUrl: string;
  enabledCount: number;
  total: number;
}

interface ApiIrServicesResponse {
  status: ApiIrStatus;
  services: ApiIrServiceItem[];
}

interface ApiIrCallResult {
  ok: boolean;
  code: number | string | null;
  message: string;
  data: unknown;
  httpStatus: number | null;
  latencyMs: number;
  simulated?: boolean;
}

/**
 * Admin «api.ir» panel: lists every api.ir web service (generated from the
 * official OpenAPI spec in `apps/api/src/apiir/apiir.constants.ts`), lets the
 * admin switch each one on/off, set a future user price and run an explicit
 * test call. Real calls are billed to the api.ir account credit, so the test
 * button is clearly marked as a paid call.
 */
export function AdminApiIr() {
  const [data, setData] = useState<ApiIrServicesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [testKey, setTestKey] = useState<string | null>(null);
  const [testPayload, setTestPayload] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<ApiIrCallResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const services = await api.get<ApiIrServicesResponse>('/admin/apiir/services');
      setData(services);
      setPriceInputs(
        Object.fromEntries(
          services.services.map((service) => [service.key, String(service.price)]),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'بارگذاری سرویس‌های api.ir ناموفق بود');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => {
    const map = new Map<string, ApiIrServiceItem[]>();
    for (const service of data?.services ?? []) {
      const list = map.get(service.group) ?? [];
      list.push(service);
      map.set(service.group, list);
    }
    return [...map.entries()];
  }, [data]);

  async function toggle(service: ApiIrServiceItem) {
    setBusyKey(service.key);
    try {
      await api.patch(`/admin/apiir/services/${service.key}`, {
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

  async function savePrice(service: ApiIrServiceItem) {
    const raw = (priceInputs[service.key] ?? '').trim();
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) {
      toast.error('هزینه باید یک عدد نامنفی باشد.');
      return;
    }
    setBusyKey(service.key);
    try {
      const result = await api.patch<{ price: number }>(
        `/admin/apiir/services/${service.key}`,
        { price: Math.floor(value) },
      );
      setData((current) =>
        current
          ? {
              ...current,
              services: current.services.map((item) =>
                item.key === service.key ? { ...item, price: result.price } : item,
              ),
            }
          : current,
      );
      setPriceInputs((current) => ({ ...current, [service.key]: String(result.price) }));
      toast.success(`هزینه سرویس «${service.label}» ثبت شد.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ثبت هزینه ناموفق بود');
    } finally {
      setBusyKey(null);
    }
  }

  async function syncPayping(service: ApiIrServiceItem) {
    if (service.price <= 0) {
      toast.error('ابتدا هزینه‌ی این سرویس را ثبت کنید.');
      return;
    }
    setBusyKey(service.key);
    try {
      const result = await api.post<{
        code: string;
        amount: number;
        updated: boolean;
      }>(`/admin/apiir/services/${service.key}/payping-product`, {});
      setData((current) =>
        current
          ? {
              ...current,
              services: current.services.map((item) =>
                item.key === service.key
                  ? {
                      ...item,
                      payping: { code: result.code, amount: result.amount },
                    }
                  : item,
              ),
            }
          : current,
      );
      toast.success(
        result.updated
          ? `محصول پی‌پینگ «${service.label}» به‌روزرسانی شد.`
          : `محصول «${service.label}» در پی‌پینگ ساخته شد.`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'همگام‌سازی با پی‌پینگ ناموفق بود',
      );
    } finally {
      setBusyKey(null);
    }
  }

  function openTest(service: ApiIrServiceItem) {
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

  async function runTest(service: ApiIrServiceItem) {
    const payload: Record<string, unknown> = {};
    for (const field of service.fields) {
      const raw = testPayload[field.name]?.trim();
      if (!raw) continue;
      payload[field.name] = field.type === 'boolean' ? raw === 'true' : raw;
    }
    const missing = service.fields.find((field) => field.required && !payload[field.name]);
    if (missing) {
      toast.error(`مقدار «${missing.label}» الزامی است`);
      return;
    }
    setBusyKey(service.key);
    setTestResult(null);
    try {
      const result = await api.post<ApiIrCallResult>(
        `/admin/apiir/services/${service.key}/test`,
        { payload },
      );
      setTestResult(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فراخوانی آزمایشی ناموفق بود');
    } finally {
      setBusyKey(null);
    }
  }

  if (loading && !data) {
    return <p className="text-sm text-muted">در حال بارگذاری سرویس‌های api.ir...</p>;
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
            <h2 className="text-sm font-extrabold text-ink">اتصال سرویس api.ir</h2>
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
            <p className="text-muted">وضعیت کلید</p>
            <p
              className={cn(
                'mt-1 font-bold',
                data?.status.simulated
                  ? 'text-sky-700'
                  : data?.status.configured
                    ? 'text-emerald-700'
                    : 'text-red-700',
              )}
            >
              {data?.status.simulated
                ? 'شبیه‌سازی لوکال (بدون هزینه)'
                : data?.status.configured
                  ? 'تنظیم شده'
                  : 'تنظیم نشده'}
            </p>
          </div>
          <div className="rounded-lg border border-line bg-surface p-3">
            <p className="text-muted">آدرس سرویس</p>
            <p className="mt-1 font-bold text-ink" dir="ltr">
              {data?.status.baseUrl ?? '—'}
            </p>
          </div>
          <div className="rounded-lg border border-line bg-surface p-3">
            <p className="text-muted">سرویس‌های فعال</p>
            <p className="mt-1 font-bold text-ink">
              {data?.status.enabledCount ?? 0} از {data?.status.total ?? 0}
            </p>
          </div>
        </div>
        {data?.status.simulated ? (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-sky-50 p-3 text-xs leading-6 text-sky-800">
            <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden />
            حالت شبیه‌سازی لوکال فعال است: همه‌ی استعلام‌ها پاسخ ساختگی برمی‌گردانند
            و هیچ درخواست واقعی به api.ir ارسال نمی‌شود؛ بنابراین هزینه‌ای از
            اعتبار حساب کم نمی‌شود. برای خاموش‌کردن، `APIIR_SIMULATOR=false` را
            تنظیم کنید.
          </p>
        ) : (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-6 text-amber-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            هر فراخوانی واقعی api.ir از اعتبار حساب api.ir کم می‌شود. دکمه‌ی «آزمایش»
            یک درخواست واقعی است؛ فقط هنگام نیاز از آن استفاده کنید. کلید فقط سمت
            سرور نگه داشته می‌شود.
          </p>
        )}
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
                      <p className="mt-1 text-[11px] leading-5 text-muted">
                        {service.description}
                      </p>
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
                        : 'تعیین نشده'}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-background p-2">
                    <button
                      type="button"
                      disabled={busyKey === service.key || service.price <= 0}
                      onClick={() => void syncPayping(service)}
                      title={
                        service.price <= 0
                          ? 'ابتدا هزینه‌ی این استعلام را ثبت کنید'
                          : 'ساخت/به‌روزرسانی محصول این استعلام در پی‌پینگ'
                      }
                      className="indeed-btn indeed-btn-secondary py-1 text-[11px] disabled:opacity-50"
                    >
                      {busyKey === service.key ? (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      ) : (
                        <RefreshCw className="size-3.5" aria-hidden />
                      )}
                      همگام‌سازی با پی‌پینگ
                    </button>
                    <span className="text-[11px] leading-5 text-muted">
                      {service.price <= 0
                        ? 'برای ساخت محصول، ابتدا هزینه‌ی استعلام را ثبت کنید.'
                        : service.payping
                          ? (
                            <>
                              محصول درگاه:{' '}
                              <span className="font-mono text-ink" dir="ltr">
                                {service.payping.code}
                              </span>
                              {service.payping.amount !== service.price
                                ? ' — قیمت تغییر کرده؛ برای به‌روزرسانی مبلغ دوباره همگام‌سازی کنید.'
                                : ''}
                            </>
                          )
                          : 'محصول درگاه ساخته نشده است.'}
                    </span>
                  </div>

                  <p className="mt-2 text-[11px] text-muted">
                    تعرفه‌ی api.ir برای هر استعلام:{' '}
                    {service.tariff && service.tariff > 0 ? (
                      <span className="font-bold text-ink">
                        {service.tariff.toLocaleString('fa-IR')} تومان
                      </span>
                    ) : (
                      'ثبت نشده'
                    )}
                  </p>

                  <button
                    type="button"
                    onClick={() => openTest(service)}
                    className="indeed-btn indeed-btn-secondary mt-3 py-1 text-[11px]"
                  >
                    <FlaskConical className="size-3.5" aria-hidden />
                    {data?.status.simulated ? 'آزمایش (شبیه‌سازی، بدون هزینه)' : 'آزمایش (هزینه‌زا)'}
                  </button>

                  {testKey === service.key ? (
                    <div className="mt-3 rounded-lg border border-line bg-background p-3">
                      {hasFile ? (
                        <p className="text-[11px] text-amber-700">
                          این سرویس فایل/مدیا می‌خواهد و از این فرم قابل آزمایش نیست.
                        </p>
                      ) : (
                        <>
                          {service.fields.length > 0 ? (
                            <div className="grid gap-2 sm:grid-cols-2">
                              {service.fields.map((field) => (
                                <label
                                  key={field.name}
                                  className="text-[11px] font-bold text-muted"
                                >
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
                          ) : (
                            <p className="text-[11px] text-muted">
                              این سرویس ورودی ندارد.
                            </p>
                          )}
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

                      {testResult ? (
                        <div className="mt-3">
                          <p
                            className={cn(
                              'text-[11px] font-bold',
                              testResult.ok ? 'text-emerald-700' : 'text-red-700',
                            )}
                          >
                            {testResult.ok ? 'موفق' : 'ناموفق'} — {testResult.message}
                            {testResult.code !== null ? ` (${testResult.code})` : ''}
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

      <p className="flex items-center gap-2 text-[11px] text-muted">
        <BadgeCheck className="size-3.5" aria-hidden />
        فهرست سرویس‌ها از اسپک رسمی api.ir ساخته می‌شود؛ با
        `python3 scripts/sync_apiir_catalog.py` به‌روز می‌شود.
      </p>
    </div>
  );
}
