'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Megaphone, Save, X } from 'lucide-react';

import { api, type AdRequest } from '@/lib/api';
import { cn } from '@/lib/utils';
import { AdminDataTable, type AdminColumn } from './AdminDataTable';
import { AdminBoosts } from './AdminBoosts';

type Tab = 'home' | 'directory' | 'settings';

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'PENDING', label: 'در انتظار تأیید' },
  { value: 'APPROVED', label: 'تأییدشده' },
  { value: 'REJECTED', label: 'ردشده' },
];

const DISPLAY_LABELS: Record<string, string> = {
  PENDING: 'در انتظار تأیید',
  SCHEDULED: 'در انتظار نمایش',
  ACTIVE: 'در حال نمایش',
  EXPIRED: 'پایان‌یافته',
  REJECTED: 'ردشده',
};

function faDate(value: string) {
  return new Date(value).toLocaleDateString('fa-IR');
}

function kindLabel(kind: AdRequest['kind']) {
  if (kind === 'BUSINESS_CARD') return 'کارت ویزیت';
  if (kind === 'BIOLINK') return 'بیولینک';
  return 'پست فید';
}

interface SettingsPayload {
  adDurationDays: number;
  adDailySlots: number;
}

/**
 * Admin «تبلیغات» panel with three tabs: home-page ad approvals, directory ads
 * («پله» — requests to lift an item to the top of its directory slice) and the
 * settings controlling how long each home ad runs and how many rotate per day.
 */
export function AdminAds() {
  const [tab, setTab] = useState<Tab>('home');
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
    if (tab !== 'home') return;
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

  const columns: Array<AdminColumn<AdRequest>> = [
    {
      key: 'target',
      label: 'مورد',
      render: (request) => (
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate font-extrabold text-ink">
            <Megaphone className="size-4 text-brand" aria-hidden />
            {request.target?.fullName ?? '—'}
          </p>
          <span className="mt-1 inline-block rounded-full bg-soft px-2 py-0.5 text-[10px] font-bold text-muted">
            {kindLabel(request.kind)}
          </span>
        </div>
      ),
    },
    {
      key: 'user',
      label: 'کاربر',
      render: (request) => (
        <span dir="ltr" className="text-xs text-muted">
          {request.user?.email}
        </span>
      ),
    },
    {
      key: 'requestedAt',
      label: 'تاریخ درخواست',
      render: (request) => (
        <span className="text-xs text-muted">{faDate(request.requestedAt)}</span>
      ),
    },
    {
      key: 'window',
      label: 'بازه نمایش',
      render: (request) =>
        request.status === 'APPROVED' ? (
          <span className="text-xs text-muted">
            {request.startedAt ? faDate(request.startedAt) : '—'} تا{' '}
            {request.endsAt ? faDate(request.endsAt) : '—'}
          </span>
        ) : (
          <span className="text-xs text-muted">—</span>
        ),
    },
    {
      key: 'note',
      label: 'یادداشت',
      render: (request) => (
        <span className="text-xs text-muted">{request.note ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      label: 'وضعیت',
      render: (request) => (
        <span
          className={cn(
            'inline-block rounded-full px-3 py-1 text-xs font-bold',
            request.status === 'PENDING'
              ? 'bg-amber-50 text-amber-700'
              : request.displayState === 'ACTIVE'
                ? 'bg-green-50 text-green-700'
                : request.displayState === 'SCHEDULED'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-red-50 text-red-700',
          )}
        >
          {request.status === 'PENDING'
            ? 'در انتظار تأیید'
            : DISPLAY_LABELS[request.displayState ?? request.status] ??
              (request.status === 'APPROVED' ? 'تأییدشده' : 'ردشده')}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'عملیات',
      render: (request) =>
        request.status === 'PENDING' ? (
          <div className="flex items-center gap-2">
            <button
              disabled={busyId === request.id}
              onClick={() => decide(request.id, 'APPROVED')}
              className="indeed-btn indeed-btn-primary py-1.5 text-xs disabled:opacity-60"
            >
              <Check className="size-3.5" aria-hidden />
              تأیید
            </button>
            <button
              disabled={busyId === request.id}
              onClick={() => decide(request.id, 'REJECTED')}
              className="indeed-btn indeed-btn-secondary py-1.5 text-xs text-red-600 disabled:opacity-60"
            >
              <X className="size-3.5" aria-hidden />
              رد
            </button>
          </div>
        ) : (
          <span className="text-xs text-muted">بررسی‌شده</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['home', 'تبلیغ در صفحه اصلی'],
            ['directory', 'تبلیغ در دایرکتوری'],
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

      {tab === 'directory' ? <AdminBoosts /> : null}

      {tab === 'settings' ? <AdminAdSettings /> : null}

      {tab === 'home' ? (
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
          ) : (
            <AdminDataTable
              columns={columns}
              rows={requests}
              rowKey={(request) => request.id}
              empty="درخواست تبلیغی در این وضعیت وجود ندارد."
              minWidthClass="min-w-[62rem]"
            />
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
