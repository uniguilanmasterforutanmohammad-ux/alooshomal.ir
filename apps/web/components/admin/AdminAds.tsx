'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Megaphone, Save, X } from 'lucide-react';

import { api, type AdRequest } from '@/lib/api';
import { cn } from '@/lib/utils';

type Tab = 'pending' | 'settings';

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'PENDING', label: 'در انتظار' },
  { value: 'APPROVED', label: 'تأییدشده' },
  { value: 'REJECTED', label: 'ردشده' },
];

interface SettingsPayload {
  adDurationDays: number;
  adDailySlots: number;
}

/**
 * Admin «تبلیغات» panel: a pending-approvals tab (approve/reject a user's ad
 * request) and a settings tab controlling how long each ad runs and how many
 * ads rotate through the home-page box per day.
 */
export function AdminAds() {
  const [tab, setTab] = useState<Tab>('pending');
  const [status, setStatus] = useState('PENDING');
  const [requests, setRequests] = useState<AdRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRequests(await api.get<AdRequest[]>(`/admin/ads?status=${status}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (tab !== 'pending') return;
    void load();
  }, [tab, load]);

  async function decide(id: string, decision: 'APPROVED' | 'REJECTED') {
    setBusyId(id);
    try {
      await api.patch(`/admin/ads/${id}`, { status: decision });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ثبت تصمیم');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['pending', 'در انتظار تأیید'],
            ['settings', 'تنظیمات'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'rounded-lg border px-4 py-2 text-sm font-bold transition',
              tab === key
                ? 'border-brand bg-brand-light text-brand'
                : 'border-[var(--vintage-border)] bg-white text-muted hover:border-brand',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'settings' ? <AdminAdSettings /> : null}

      {tab === 'pending' ? (
        <div className="flex flex-col gap-3">
          {error ? (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatus(filter.value)}
                className={
                  status === filter.value
                    ? 'indeed-btn indeed-btn-primary py-2 text-sm'
                    : 'indeed-btn indeed-btn-secondary py-2 text-sm'
                }
              >
                {filter.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-muted">در حال بارگذاری...</p>
          ) : requests.length === 0 ? (
            <div className="indeed-panel p-8 text-center text-muted">
              درخواست تبلیغی در این وضعیت وجود ندارد.
            </div>
          ) : (
            requests.map((request) => (
              <div
                key={request.id}
                className="indeed-panel flex flex-wrap items-center justify-between gap-4 p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Megaphone className="size-4 text-brand" aria-hidden />
                    <h3 className="truncate text-base font-extrabold text-ink">
                      {request.target?.fullName ?? '—'}
                    </h3>
                    <span className="rounded-full bg-soft px-2 py-0.5 text-[10px] font-bold text-muted">
                      {request.kind === 'BUSINESS_CARD' ? 'کارت ویزیت' : 'بیولینک'}
                    </span>
                  </div>
                  <p dir="ltr" className="mt-1 text-xs text-muted">
                    {request.user?.email}
                  </p>
                  {request.note ? (
                    <p className="mt-1 text-xs text-muted">یادداشت: {request.note}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted">
                    تاریخ درخواست:{' '}
                    {new Date(request.requestedAt).toLocaleDateString('fa-IR')}
                    {request.endsAt
                      ? ` • پایان نمایش: ${new Date(request.endsAt).toLocaleDateString('fa-IR')}`
                      : ''}
                  </p>
                </div>

                {request.status === 'PENDING' ? (
                  <div className="flex items-center gap-2">
                    <button
                      disabled={busyId === request.id}
                      onClick={() => decide(request.id, 'APPROVED')}
                      className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
                    >
                      <Check className="size-4" aria-hidden />
                      تأیید
                    </button>
                    <button
                      disabled={busyId === request.id}
                      onClick={() => decide(request.id, 'REJECTED')}
                      className="indeed-btn indeed-btn-secondary py-2 text-sm text-red-600 disabled:opacity-60"
                    >
                      <X className="size-4" aria-hidden />
                      رد
                    </button>
                  </div>
                ) : (
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-bold',
                      request.status === 'APPROVED'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700',
                    )}
                  >
                    {request.status === 'APPROVED' ? 'تأییدشده' : 'ردشده'}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Ad duration + daily slot count, persisted in the `Setting` table. */
function AdminAdSettings() {
  const [duration, setDuration] = useState('');
  const [slots, setSlots] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<SettingsPayload>('/admin/settings');
      setDuration(String(result.adDurationDays));
      setSlots(String(result.adDailySlots));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری تنظیمات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const parsedDuration = Number(duration);
    if (!Number.isInteger(parsedDuration) || parsedDuration < 1 || parsedDuration > 365) {
      setError('مدت نمایش تبلیغ باید بین ۱ تا ۳۶۵ روز باشد');
      return;
    }
    const parsedSlots = Number(slots);
    if (!Number.isInteger(parsedSlots) || parsedSlots < 1 || parsedSlots > 20) {
      setError('تعداد تبلیغ در روز باید بین ۱ تا ۲۰ باشد');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.patch<SettingsPayload>('/admin/settings', {
        adDurationDays: parsedDuration,
        adDailySlots: parsedSlots,
      });
      setDuration(String(result.adDurationDays));
      setSlots(String(result.adDailySlots));
      setMessage('تنظیمات تبلیغات ذخیره شد.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره تنظیمات ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="indeed-panel p-5">
      <div className="flex items-center gap-2">
        <Megaphone className="size-5 text-brand" aria-hidden />
        <h3 className="text-sm font-extrabold text-ink">تنظیمات تبلیغات</h3>
      </div>
      <p className="mt-1 text-xs text-muted">
        مدت نمایش هر تبلیغ تأییدشده و تعداد تبلیغی که در کادر صفحه اصلی در هر روز
        نمایش داده می‌شود.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-muted">در حال بارگذاری...</p>
      ) : (
        <form onSubmit={save} className="mt-4 flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            مدت نمایش هر تبلیغ (روز)
            <input
              type="number"
              min={1}
              max={365}
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              className="w-40 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            تعداد تبلیغ نمایش‌داده‌شده در روز
            <input
              type="number"
              min={1}
              max={20}
              value={slots}
              onChange={(event) => setSlots(event.target.value)}
              className="w-40 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
          >
            <Save className="size-4" aria-hidden />
            ذخیره
          </button>
          {message ? <p className="text-sm text-green-700">{message}</p> : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </form>
      )}
    </div>
  );
}
