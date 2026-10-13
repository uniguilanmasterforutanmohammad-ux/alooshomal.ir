'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw, Save, Search, ShieldCheck, User as UserIcon } from 'lucide-react';

import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Pagination, type PaginationMeta } from '@/components/ui/Pagination';

export interface ActivityRow {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  actorIsAdmin: boolean;
  action: string;
  summary: string;
  entityType: string | null;
  entityId: string | null;
  ip: string | null;
  createdAt: string;
}

interface ActivityPayload {
  items: ActivityRow[];
  meta: PaginationMeta;
  actions: string[];
}

interface ActivitySettings {
  activityRetentionMonths: number;
}

/** Friendly Persian labels for the machine `action` keys. */
const ACTION_LABELS: Record<string, string> = {
  USER_REGISTERED: 'ثبت‌نام کاربر',
  USER_LOGIN: 'ورود کاربر',
  USER_ACTIVATED: 'فعال‌سازی کاربر',
  USER_DEACTIVATED: 'غیرفعال‌سازی کاربر',
  USER_COMMENT_SET: 'یادداشت مدیر',
  USER_DELETED: 'حذف کاربر',
  BIOLINK_CREATED: 'ساخت بیولینک',
  BIOLINK_UPDATED: 'ویرایش بیولینک',
  BIOLINK_DELETED: 'حذف بیولینک',
  BIOLINK_APPROVED: 'تأیید بیولینک',
  BIOLINK_REJECTED: 'رد بیولینک',
  CARD_CREATED: 'ساخت کارت ویزیت',
  CARD_UPDATED: 'ویرایش کارت ویزیت',
  CARD_DELETED: 'حذف کارت ویزیت',
  CARD_APPROVED: 'تأیید کارت ویزیت',
  CARD_REJECTED: 'رد کارت ویزیت',
  TICKET_CREATED: 'ثبت تیکت',
  TICKET_USER_REPLY: 'پاسخ کاربر در تیکت',
  TICKET_STAFF_REPLY: 'پاسخ مدیر در تیکت',
  TICKET_STATUS_CHANGED: 'تغییر وضعیت تیکت',
  SUBSCRIPTION_REQUESTED: 'درخواست اشتراک',
  SUBSCRIPTION_APPROVED: 'تأیید اشتراک',
  SUBSCRIPTION_REJECTED: 'رد اشتراک',
  SUBSCRIPTION_ASSIGNED: 'تخصیص اشتراک',
  BOOST_REQUESTED: 'درخواست پله',
  BOOST_APPROVED: 'تأیید پله',
  BOOST_REJECTED: 'رد پله',
  PROFILE_CHANGE_REQUESTED: 'درخواست تغییر نام',
  PROFILE_CHANGE_APPROVED: 'تأیید تغییر نام',
  PROFILE_CHANGE_REJECTED: 'رد تغییر نام',
  PROFILE_PHONE_CHANGE_REQUESTED: 'درخواست تغییر شماره موبایل',
  PROFILE_EMAIL_CHANGE_REQUESTED: 'درخواست تغییر ایمیل',
  PROFILE_PHONE_CHANGED: 'تغییر شماره موبایل',
  PROFILE_EMAIL_CHANGED: 'تغییر ایمیل',
  USER_PASSWORD_SET: 'ثبت/تغییر رمز عبور',
};

const PAGE_SIZE = 20;

function faDateTime(value: string) {
  return new Date(value).toLocaleString('fa-IR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

/**
 * Admin "گزارش‌های سیستم" tab: a paginated, one-line-per-event activity log
 * with a configurable retention window (months) after which older rows are
 * pruned automatically.
 */
export function ActivityLogPanel() {
  const [data, setData] = useState<ActivityPayload | null>(null);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [adminOnly, setAdminOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [retention, setRetention] = useState('');
  const [savingRetention, setSavingRetention] = useState(false);
  const [retentionMessage, setRetentionMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (action) params.set('action', action);
      if (search.trim()) params.set('search', search.trim());
      if (adminOnly) params.set('adminOnly', 'true');
      const result = await api.get<ActivityPayload>(`/admin/activity?${params.toString()}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری گزارش‌ها');
    } finally {
      setLoading(false);
    }
  }, [page, action, search, adminOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    api
      .get<ActivitySettings>('/admin/activity/settings')
      .then((result) => setRetention(String(result.activityRetentionMonths)))
      .catch(() => undefined);
  }, []);

  async function saveRetention() {
    const months = Number(retention);
    if (!Number.isInteger(months) || months < 1 || months > 60) {
      setError('مدت ماندگاری باید عددی بین ۱ تا ۶۰ ماه باشد');
      return;
    }
    setSavingRetention(true);
    setError(null);
    setRetentionMessage(null);
    try {
      const result = await api.patch<ActivitySettings & { pruned: number }>(
        '/admin/activity/settings',
        { activityRetentionMonths: months },
      );
      setRetention(String(result.activityRetentionMonths));
      setRetentionMessage(
        result.pruned > 0
          ? `ذخیره شد و ${result.pruned.toLocaleString('fa-IR')} رویداد قدیمی پاک شد.`
          : 'مدت ماندگاری ذخیره شد.',
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره ناموفق بود');
    } finally {
      setSavingRetention(false);
    }
  }

  function applyFilter(next: () => void) {
    setPage(1);
    next();
  }

  const meta = data?.meta ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div className="indeed-panel p-5">
        <div className="flex items-center gap-2">
          <Activity className="size-5 text-brand" aria-hidden />
          <h3 className="text-sm font-extrabold text-ink">ماندگاری گزارش‌ها</h3>
        </div>
        <p className="mt-1 text-xs text-muted">
          رویدادهای قدیمی‌تر از این مدت به‌صورت خودکار حذف می‌شوند تا حجم دیتابیس سنگین
          نشود. حذف یک‌بار در روز و همچنین به‌محض تغییر همین مقدار انجام می‌شود.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            مدت ماندگاری (ماه)
            <input
              type="number"
              min={1}
              max={60}
              dir="ltr"
              value={retention}
              onChange={(event) => setRetention(event.target.value)}
              className="w-32 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-brand"
            />
          </label>
          <button
            type="button"
            onClick={saveRetention}
            disabled={savingRetention}
            className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
          >
            <Save className="size-4" aria-hidden />
            ذخیره
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="indeed-btn indeed-btn-secondary py-2 text-sm"
          >
            <RefreshCw className="size-4" aria-hidden />
            به‌روزرسانی
          </button>
        </div>
        {retentionMessage ? (
          <p className="mt-3 rounded-lg bg-green-50 p-2 text-xs text-green-700">
            {retentionMessage}
          </p>
        ) : null}
      </div>

      <div className="indeed-panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b-2 border-dashed border-[var(--vintage-accent-hover)] px-5 py-3">
          <h3 className="text-sm font-extrabold text-ink">گزارش رویدادهای سیستم</h3>
          <span className="text-xs text-muted">
            {meta ? `${meta.total.toLocaleString('fa-IR')} رویداد` : ''}
          </span>
        </div>

        <div className="flex flex-wrap items-end gap-3 border-b border-[var(--vintage-border)] px-5 py-3">
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-bold text-muted">
            جستجو
            <span className="flex items-center gap-2 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2">
              <Search className="size-4 text-muted" aria-hidden />
              <input
                value={search}
                onChange={(event) => applyFilter(() => setSearch(event.target.value))}
                placeholder="توضیح یا ایمیل..."
                className="w-full bg-transparent text-sm font-normal text-ink outline-none"
              />
            </span>
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            نوع رویداد
            <select
              value={action}
              onChange={(event) => applyFilter(() => setAction(event.target.value))}
              className="rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-brand"
            >
              <option value="">همه</option>
              {(data?.actions ?? []).map((key) => (
                <option key={key} value={key}>
                  {ACTION_LABELS[key] ?? key}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 pb-2 text-xs font-bold text-muted">
            <input
              type="checkbox"
              checked={adminOnly}
              onChange={(event) => applyFilter(() => setAdminOnly(event.target.checked))}
              className="size-4 accent-[#7c3aed]"
            />
            فقط اقدامات مدیر
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="bg-[#fbf3e9] text-xs text-muted">
                <th className="px-4 py-2.5 font-bold">کاربر</th>
                <th className="px-4 py-2.5 font-bold">رویداد</th>
                <th className="px-4 py-2.5 font-bold">تاریخ و ساعت</th>
                <th className="px-4 py-2.5 font-bold">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : null}
              {(data?.items ?? []).map((row) => (
                <tr key={row.id} className="border-t border-[var(--vintage-border)]">
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-1.5 text-xs">
                      {row.actorIsAdmin ? (
                        <ShieldCheck className="size-3.5 text-brand" aria-hidden />
                      ) : (
                        <UserIcon className="size-3.5 text-muted" aria-hidden />
                      )}
                      <span className="font-semibold text-ink" dir="ltr">
                        {row.actorEmail ?? '—'}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        'me-2 rounded-md px-1.5 py-0.5 text-[10px] font-bold',
                        row.actorIsAdmin
                          ? 'bg-brand-light text-brand'
                          : 'bg-soft text-muted',
                      )}
                    >
                      {ACTION_LABELS[row.action] ?? row.action}
                    </span>
                    <span className="text-xs text-muted">{row.summary}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted">
                    {faDateTime(row.createdAt)}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted" dir="ltr">
                    {row.ip ?? '—'}
                  </td>
                </tr>
              ))}
              {data && data.items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    رویدادی ثبت نشده است.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {meta && meta.totalPages > 1 ? (
          <div className="border-t border-[var(--vintage-border)] p-4">
            <Pagination meta={meta} onPage={setPage} />
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
