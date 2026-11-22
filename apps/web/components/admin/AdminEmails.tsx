'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, Mail, MessageSquare, RefreshCw, Search } from 'lucide-react';

import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Pagination, type PaginationMeta } from '@/components/ui/Pagination';

interface NotificationRow {
  id: string;
  channel: 'EMAIL' | 'SMS' | string;
  to: string;
  subject: string;
  purpose: string | null;
  status: 'SENT' | 'FAILED' | string;
  error: string | null;
  createdAt: string;
  user: {
    id: string;
    fullName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

interface NotificationsPayload {
  items: NotificationRow[];
  meta: PaginationMeta;
}

const PURPOSE_LABELS: Record<string, string> = {
  login: 'ورود به سایت',
  'phone-change': 'تغییر شماره موبایل',
  'email-change': 'تغییر ایمیل',
  'password-reset': 'تغییر رمز عبور',
  'admin-login': 'ورود مدیران',
  claim: 'تصاحب کسب‌وکار',
  register: 'ثبت‌نام',
  'system-alert': 'هشدار منابع سرور',
  'admin-notification': 'اطلاع‌رسانی مدیر',
  monitoring: 'پایش منابع سرور',
  text: 'پیامک متنی',
  'admin-test': 'آزمایش مدیر',
};

const PAGE_SIZE = 20;

function faDateTime(value: string) {
  return new Date(value).toLocaleString('fa-IR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

/**
 * Admin «ارسال اطلاع‌رسانی‌ها به کاربران» page: every e-mail and SMS the
 * platform tried to deliver, with recipient, channel, linked user, purpose,
 * status and time. OTP codes are never stored — only a redacted subject.
 */
export function AdminEmails() {
  const [data, setData] = useState<NotificationsPayload | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [channel, setChannel] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      if (channel) params.set('channel', channel);
      const result = await api.get<NotificationsPayload>(
        `/admin/notifications-log?${params.toString()}`,
      );
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'خطا در بارگذاری اطلاع‌رسانی‌ها',
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, status, channel]);

  useEffect(() => {
    void load();
  }, [load]);

  function applyFilter(update: () => void) {
    update();
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink">
            <Bell className="size-5 text-brand" aria-hidden />
            ارسال اطلاع‌رسانی‌ها به کاربران
          </h2>
          <p className="mt-1 text-xs text-muted">
            همه‌ی ایمیل‌ها و پیامک‌های ارسال‌شده به کاربران با گیرنده، کانال،
            وضعیت و زمان ارسال. کد امنیتی ذخیره نمی‌شود.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="indeed-btn indeed-btn-secondary py-2 text-sm"
          disabled={loading}
        >
          <RefreshCw className={cn('size-4', loading && 'animate-spin')} aria-hidden />
          به‌روزرسانی
        </button>
      </div>

      <div className="indeed-panel overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 border-b border-[var(--vintage-border)] px-5 py-3">
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-bold text-muted">
            جستجو
            <span className="flex items-center gap-2 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2">
              <Search className="size-4 text-muted" aria-hidden />
              <input
                value={search}
                onChange={(event) => applyFilter(() => setSearch(event.target.value))}
                placeholder="ایمیل/شماره گیرنده یا موضوع..."
                className="w-full bg-transparent text-sm font-normal text-ink outline-none"
              />
            </span>
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            کانال
            <select
              value={channel}
              onChange={(event) => applyFilter(() => setChannel(event.target.value))}
              className="rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-brand"
            >
              <option value="">همه</option>
              <option value="EMAIL">ایمیل</option>
              <option value="SMS">پیامک</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            وضعیت
            <select
              value={status}
              onChange={(event) => applyFilter(() => setStatus(event.target.value))}
              className="rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-brand"
            >
              <option value="">همه</option>
              <option value="SENT">ارسال‌شده</option>
              <option value="FAILED">ناموفق</option>
            </select>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="bg-[var(--vintage-surface)] text-xs text-muted">
                <th className="px-4 py-2.5 font-bold">کانال</th>
                <th className="px-4 py-2.5 font-bold">گیرنده</th>
                <th className="px-4 py-2.5 font-bold">کاربر</th>
                <th className="px-4 py-2.5 font-bold">موضوع / نوع</th>
                <th className="px-4 py-2.5 font-bold">وضعیت</th>
                <th className="px-4 py-2.5 font-bold">تاریخ و ساعت</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : null}
              {(data?.items ?? []).map((row) => (
                <tr key={`${row.channel}-${row.id}`} className="border-t border-[var(--vintage-border)]">
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold',
                        row.channel === 'EMAIL'
                          ? 'bg-sky-50 text-sky-700'
                          : 'bg-emerald-50 text-emerald-700',
                      )}
                    >
                      {row.channel === 'EMAIL' ? (
                        <Mail className="size-3" aria-hidden />
                      ) : (
                        <MessageSquare className="size-3" aria-hidden />
                      )}
                      {row.channel === 'EMAIL' ? 'ایمیل' : 'پیامک'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs font-semibold text-ink" dir="ltr">
                    {row.to}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted">
                    {row.user?.fullName || row.user?.email || row.user?.phone || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted">
                    <span className="block text-ink">{row.subject}</span>
                    {row.purpose ? (
                      <span className="text-[10px] text-muted">
                        {PURPOSE_LABELS[row.purpose] ?? row.purpose}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        'rounded-md px-1.5 py-0.5 text-[10px] font-bold',
                        row.status === 'FAILED'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-green-50 text-green-700',
                      )}
                      title={row.error ?? undefined}
                    >
                      {row.status === 'FAILED' ? 'ناموفق' : 'ارسال‌شده'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted">
                    {faDateTime(row.createdAt)}
                  </td>
                </tr>
              ))}
              {data && data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    اطلاع‌رسانی‌ای ثبت نشده است.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {data && data.meta.totalPages > 1 ? (
          <div className="border-t border-[var(--vintage-border)] p-4">
            <Pagination meta={data.meta} onPage={setPage} />
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
