'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Combine,
  Pencil,
  Plus,
  FlaskConical,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UploadCloud,
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
  composites?: ZohalComposite[];
  payping?: {
    products: Record<string, string | null>;
    identityBundleAmount: number;
  };
}

interface ZohalCompositeService {
  key: string;
  label: string;
  group: string;
  price: number;
  enabled: boolean;
}

interface ZohalComposite {
  key: string;
  label: string;
  description: string | null;
  serviceKeys: string[];
  amount: number;
  enabled: boolean;
  serviceLabels: string[];
  services: ZohalCompositeService[];
  purchasable: boolean;
  issues: string[];
  paypingCode: string | null;
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
  const [syncingProducts, setSyncingProducts] = useState(false);
  const [syncKey, setSyncKey] = useState<string | null>(null);
  const [compositeBusy, setCompositeBusy] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [compositeForm, setCompositeForm] = useState({
    label: '',
    description: '',
    amount: '',
    serviceKeys: [] as string[],
    enabled: true,
  });

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

  async function syncPaypingProducts() {
    setSyncingProducts(true);
    try {
      const result = await api.post<{
        products: Record<string, string | null>;
        identityBundleAmount: number;
      }>('/admin/zohal/payping-products');
      const count = Object.values(result.products).filter(Boolean).length;
      toast.success(
        `${count} محصول پی‌پینگ ساخته/همگام شد؛ محصول واحد استعلام هویت: ${result.identityBundleAmount.toLocaleString('fa-IR')} تومان.`,
      );
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'همگام‌سازی محصولات ناموفق بود');
    } finally {
      setSyncingProducts(false);
    }
  }

  async function syncOneProduct(key: string) {
    setSyncKey(key);
    try {
      const endpoint =
        key === 'identity_bundle'
          ? '/admin/zohal/identity-bundle/payping-product'
          : key.startsWith('composite:')
            ? `/admin/zohal/composites/${key.slice('composite:'.length)}/payping-product`
            : `/admin/zohal/services/${key}/payping-product`;
      const result = await api.post<{ code: string | null }>(endpoint);
      toast[
        result.code ? 'success' : 'error'
      ](
        result.code
          ? 'محصول پی‌پینگ ساخته/بروزرسانی شد.'
          : 'ساخت محصول ممکن نشد؛ فعال/هزینه‌دار بودن ماژول و تنظیمات درگاه را بررسی کنید.',
      );
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'همگام‌سازی محصول ناموفق بود');
    } finally {
      setSyncKey(null);
    }
  }

  function resetCompositeForm() {
    setEditingKey(null);
    setCompositeForm({
      label: '',
      description: '',
      amount: '',
      serviceKeys: [],
      enabled: true,
    });
  }

  function editComposite(composite: ZohalComposite) {
    setEditingKey(composite.key);
    setCompositeForm({
      label: composite.label,
      description: composite.description ?? '',
      amount: composite.amount > 0 ? String(composite.amount) : '',
      serviceKeys: [...composite.serviceKeys],
      enabled: composite.enabled,
    });
  }

  async function saveComposite() {
    if (!compositeForm.label.trim()) {
      toast.error('نام محصول را وارد کنید.');
      return;
    }
    if (compositeForm.serviceKeys.length === 0) {
      toast.error('حداقل یک ماژول را انتخاب کنید.');
      return;
    }
    setCompositeBusy('save');
    try {
      const body = {
        label: compositeForm.label.trim(),
        description: compositeForm.description.trim() || undefined,
        serviceKeys: compositeForm.serviceKeys,
        amount: Number(compositeForm.amount || 0),
        enabled: compositeForm.enabled,
      };
      if (editingKey) {
        await api.patch(`/admin/zohal/composites/${editingKey}`, body);
        toast.success('محصول ترکیبی بروزرسانی شد.');
      } else {
        await api.post('/admin/zohal/composites', body);
        toast.success('محصول ترکیبی ساخته شد.');
      }
      resetCompositeForm();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ثبت محصول ترکیبی ناموفق بود');
    } finally {
      setCompositeBusy(null);
    }
  }

  async function deleteComposite(composite: ZohalComposite) {
    if (!window.confirm(`محصول ترکیبی «${composite.label}» حذف شود؟`)) return;
    setCompositeBusy(composite.key);
    try {
      await api.delete(`/admin/zohal/composites/${composite.key}`);
      toast.success('محصول ترکیبی حذف شد.');
      if (editingKey === composite.key) resetCompositeForm();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حذف محصول ترکیبی ناموفق بود');
    } finally {
      setCompositeBusy(null);
    }
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
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void syncPaypingProducts()}
              disabled={syncingProducts}
              className="indeed-btn indeed-btn-secondary py-1 text-xs"
            >
              {syncingProducts ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <BadgeCheck className="size-3.5" aria-hidden />
              )}
              همگام‌سازی محصولات درگاه
            </button>
            <button
              type="button"
              onClick={() => void load()}
              className="indeed-btn indeed-btn-secondary py-1 text-xs"
            >
              <RefreshCw className="size-3.5" aria-hidden />
              بروزرسانی
            </button>
          </div>
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink">
              <BadgeCheck className="size-4 text-brand" aria-hidden />
              محصولات پی‌پینگ خدمات و استعلام‌ها
            </h2>
            <p className="mt-1 text-xs leading-6 text-muted">
              برای هر خدمت فعال یک محصول در درگاه ساخته می‌شود. دو استعلام
              «شاهکار» و «استعلام هویتی» با هم ادغام می‌شوند و مبلغشان جمع شده و
              به‌صورت یک محصول واحد ساخته می‌شود.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void syncPaypingProducts()}
            disabled={syncingProducts}
            className="indeed-btn indeed-btn-primary py-2 text-xs"
          >
            {syncingProducts ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <BadgeCheck className="size-4" aria-hidden />
            )}
            {syncingProducts
              ? 'در حال ساخت محصولات...'
              : 'ساخت/همگام‌سازی محصولات درگاه'}
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-xs">
            <thead>
              <tr className="text-muted">
                <th className="border-b border-line p-2 text-right">خدمت</th>
                <th className="border-b border-line p-2 text-right">مبلغ (تومان)</th>
                <th className="border-b border-line p-2 text-right">کد محصول</th>
                <th className="border-b border-line p-2 text-right">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {(data?.services ?? [])
                .filter(
                  (service) =>
                    service.enabled &&
                    service.price > 0 &&
                    service.key !== 'shahkar' &&
                    service.key !== 'national_identity_inquiry',
                )
                .map((service) => (
                  <tr key={service.key}>
                    <td className="border-b border-line p-2 text-ink">
                      {service.label}
                    </td>
                    <td className="border-b border-line p-2 text-muted">
                      {service.price.toLocaleString('fa-IR')}
                    </td>
                    <td className="border-b border-line p-2 text-muted" dir="ltr">
                      {data?.payping?.products?.[service.key] ?? 'ساخته نشده'}
                    </td>
                    <td className="border-b border-line p-2">
                      <button
                        type="button"
                        disabled={syncKey === service.key}
                        onClick={() => void syncOneProduct(service.key)}
                        className="indeed-btn indeed-btn-secondary py-1 text-[11px]"
                      >
                        {syncKey === service.key ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden />
                        ) : (
                          <UploadCloud className="size-3.5" aria-hidden />
                        )}
                        همگام‌سازی
                      </button>
                    </td>
                  </tr>
                ))}
              <tr>
                <td className="p-2 text-ink">
                  استعلام هویت (شاهکار + هویتی) — محصول واحد
                </td>
                <td className="p-2 text-muted">
                  {(data?.payping?.identityBundleAmount ?? 0).toLocaleString(
                    'fa-IR',
                  )}
                </td>
                <td className="p-2 text-muted" dir="ltr">
                  {data?.payping?.products?.identity_bundle ?? 'ساخته نشده'}
                </td>
                <td className="p-2">
                  <button
                    type="button"
                    disabled={syncKey === 'identity_bundle'}
                    onClick={() => void syncOneProduct('identity_bundle')}
                    className="indeed-btn indeed-btn-secondary py-1 text-[11px]"
                  >
                    {syncKey === 'identity_bundle' ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      <UploadCloud className="size-3.5" aria-hidden />
                    )}
                    همگام‌سازی
                  </button>
                </td>
              </tr>
              {(data?.composites ?? []).map((composite) => (
                <tr key={composite.key}>
                  <td className="border-t border-line p-2 text-ink">
                    {composite.label}
                    <span className="mr-1 text-[10px] text-muted">
                      ({composite.serviceLabels.join(' + ')})
                    </span>
                  </td>
                  <td className="border-t border-line p-2 text-muted">
                    {composite.amount.toLocaleString('fa-IR')}
                  </td>
                  <td className="border-t border-line p-2 text-muted" dir="ltr">
                    {composite.paypingCode ?? 'ساخته نشده'}
                  </td>
                  <td className="border-t border-line p-2">
                    <button
                      type="button"
                      disabled={syncKey === `composite:${composite.key}`}
                      onClick={() =>
                        void syncOneProduct(`composite:${composite.key}`)
                      }
                      className="indeed-btn indeed-btn-secondary py-1 text-[11px]"
                    >
                      {syncKey === `composite:${composite.key}` ? (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      ) : (
                        <UploadCloud className="size-3.5" aria-hidden />
                      )}
                      همگام‌سازی
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="indeed-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink">
              <Combine className="size-4 text-brand" aria-hidden />
              محصولات ترکیبی (چند ماژول در یک محصول)
            </h2>
            <p className="mt-1 text-xs leading-6 text-muted">
              چند ماژول هزینه‌دار را انتخاب کنید و یک محصول بسازید؛ کاربر با یک
              پرداخت همه‌ی آن‌ها را دریافت می‌کند. مبلغ خالی یعنی جمع تعرفه‌ی
              ماژول‌ها.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-line bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[11px] font-bold text-muted">
              نام محصول *
              <input
                className="indeed-input mt-1 py-1 text-xs"
                value={compositeForm.label}
                onChange={(event) =>
                  setCompositeForm((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                placeholder="مثلاً استعلام هویت و جواز کسب"
              />
            </label>
            <label className="text-[11px] font-bold text-muted">
              مبلغ ثابت (تومان) — خالی = جمع تعرفه‌ها
              <input
                className="indeed-input mt-1 py-1 text-xs"
                dir="ltr"
                inputMode="numeric"
                value={compositeForm.amount}
                onChange={(event) =>
                  setCompositeForm((current) => ({
                    ...current,
                    amount: event.target.value.replace(/\D/g, ''),
                  }))
                }
              />
            </label>
          </div>
          <label className="mt-3 block text-[11px] font-bold text-muted">
            توضیح
            <input
              className="indeed-input mt-1 py-1 text-xs"
              value={compositeForm.description}
              onChange={(event) =>
                setCompositeForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </label>
          <div className="mt-3">
            <p className="text-[11px] font-bold text-muted">ماژول‌ها *</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(data?.services ?? [])
                .filter((service) => !service.fields.some((f) => f.type === 'file'))
                .map((service) => {
                  const checked = compositeForm.serviceKeys.includes(service.key);
                  return (
                    <label
                      key={service.key}
                      className={cn(
                        'flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-[11px]',
                        checked
                          ? 'border-brand bg-brand-light text-brand'
                          : 'border-line bg-background text-muted',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={checked}
                        onChange={(event) =>
                          setCompositeForm((current) => ({
                            ...current,
                            serviceKeys: event.target.checked
                              ? [...current.serviceKeys, service.key]
                              : current.serviceKeys.filter(
                                  (key) => key !== service.key,
                                ),
                          }))
                        }
                      />
                      <span>
                        <span className="block font-bold text-ink">
                          {service.label}
                        </span>
                        <span className="block">
                          {service.price > 0
                            ? `${service.price.toLocaleString('fa-IR')} تومان`
                            : 'رایگان'}
                          {!service.enabled ? ' — غیرفعال' : ''}
                        </span>
                      </span>
                    </label>
                  );
                })}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-muted">
              <input
                type="checkbox"
                checked={compositeForm.enabled}
                onChange={(event) =>
                  setCompositeForm((current) => ({
                    ...current,
                    enabled: event.target.checked,
                  }))
                }
              />
              فعال برای فروش
            </label>
            <button
              type="button"
              disabled={compositeBusy === 'save'}
              onClick={() => void saveComposite()}
              className="indeed-btn indeed-btn-primary py-1 text-[11px]"
            >
              {compositeBusy === 'save' ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : editingKey ? (
                <Pencil className="size-3.5" aria-hidden />
              ) : (
                <Plus className="size-3.5" aria-hidden />
              )}
              {editingKey ? 'ذخیره تغییرات' : 'ساخت محصول ترکیبی'}
            </button>
            {editingKey ? (
              <button
                type="button"
                onClick={resetCompositeForm}
                className="indeed-btn indeed-btn-secondary py-1 text-[11px]"
              >
                انصراف
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {(data?.composites ?? []).length === 0 ? (
            <p className="text-xs text-muted">هنوز محصول ترکیبی ساخته نشده است.</p>
          ) : (
            (data?.composites ?? []).map((composite) => (
              <div
                key={composite.key}
                className="rounded-xl border border-line bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-ink">{composite.label}</p>
                    <p className="mt-1 text-[11px] text-muted">
                      {composite.serviceLabels.join(' + ')}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-bold',
                      composite.enabled
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-600',
                    )}
                  >
                    {composite.enabled ? 'فعال' : 'غیرفعال'}
                  </span>
                </div>
                <p className="mt-2 text-xs font-bold text-brand">
                  {composite.amount.toLocaleString('fa-IR')} تومان
                </p>
                {composite.issues.length > 0 ? (
                  <p className="mt-2 rounded-lg bg-amber-50 p-2 text-[10px] leading-5 text-amber-800">
                    {composite.issues.join('؛ ')}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => editComposite(composite)}
                    className="indeed-btn indeed-btn-secondary py-1 text-[11px]"
                  >
                    <Pencil className="size-3.5" aria-hidden />
                    ویرایش
                  </button>
                  <button
                    type="button"
                    disabled={syncKey === `composite:${composite.key}`}
                    onClick={() =>
                      void syncOneProduct(`composite:${composite.key}`)
                    }
                    className="indeed-btn indeed-btn-secondary py-1 text-[11px]"
                  >
                    <UploadCloud className="size-3.5" aria-hidden />
                    پی‌پینگ
                  </button>
                  <button
                    type="button"
                    disabled={compositeBusy === composite.key}
                    onClick={() => void deleteComposite(composite)}
                    className="indeed-btn indeed-btn-secondary py-1 text-[11px] text-red-700"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    حذف
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
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
              // The two identity inquiries share one combined PayPing product.
              const isIdentity =
                service.key === 'shahkar' ||
                service.key === 'national_identity_inquiry';
              const paypingCode = isIdentity
                ? data?.payping?.products?.identity_bundle
                : data?.payping?.products?.[service.key];
              return (
                <div
                  key={service.key}
                  className="min-w-0 rounded-xl border border-line bg-surface p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-ink">
                        {service.label}
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-bold',
                            service.price > 0
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700',
                          )}
                        >
                          {service.price > 0 ? 'غیر رایگان' : 'رایگان'}
                        </span>
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-muted">{service.description}</p>
                      <p
                        className="mt-1 break-all font-mono text-[10px] text-muted"
                        dir="ltr"
                      >
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

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openTest(service)}
                      className="indeed-btn indeed-btn-secondary py-1 text-[11px]"
                    >
                      <FlaskConical className="size-3.5" aria-hidden />
                      آزمایش (هزینه‌زا)
                    </button>
                    <button
                      type="button"
                      disabled={syncKey === service.key}
                      onClick={() => void syncOneProduct(service.key)}
                      className="indeed-btn indeed-btn-secondary py-1 text-[11px]"
                    >
                      {syncKey === service.key ? (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      ) : (
                        <UploadCloud className="size-3.5" aria-hidden />
                      )}
                      همگام‌سازی پی‌پینگ
                    </button>
                    <span
                      className="min-w-0 break-all font-mono text-[10px] text-muted"
                      dir="ltr"
                      title="کد محصول پی‌پینگ"
                    >
                      {paypingCode ?? 'ساخته نشده'}
                    </span>
                  </div>

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
