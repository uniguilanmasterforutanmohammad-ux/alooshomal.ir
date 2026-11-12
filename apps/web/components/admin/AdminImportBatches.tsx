'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CalendarClock,
  Download,
  Loader2,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';

import { api } from '@/lib/api';
import { fa, formatJalali } from '@/lib/jalali';

interface ImportBatch {
  id: string;
  label: string;
  source: string | null;
  note: string | null;
  createdAt: string;
  rolledBackAt: string | null;
  rolledBackCount: number;
  total: number;
  remaining: number;
  claimed: number;
}

interface ImportBatchesResponse {
  items: ImportBatch[];
  totals: {
    batches: number;
    total: number;
    remaining: number;
    claimed: number;
  };
}

interface ImportBatchResult {
  batchId: string;
  label: string;
  imported: number;
  skipped: number;
  errors: string[];
}

interface UserOption {
  id: string;
  email: string;
  fullName: string | null;
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * «دسته‌های ایمپورت کسب‌وکار» — each external import run is its own box with
 * the import date/time, counts, a CSV of phone numbers + public links, and a
 * one-click rollback. Rollback only removes cards that are still unclaimed, so
 * a card whose owner has claimed/edited it is never deleted.
 */
export function AdminImportBatches() {
  const [data, setData] = useState<ImportBatchesResponse | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [ownerId, setOwnerId] = useState('');
  const [label, setLabel] = useState('');
  const [importing, setImporting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const [batches, userList] = await Promise.all([
        api.get<ImportBatchesResponse>('/admin/import-batches'),
        api.get<{ items: UserOption[] }>('/admin/users?limit=100'),
      ]);
      setData(batches);
      setUsers(userList.items);
      setOwnerId(
        (prev) =>
          prev ||
          userList.items.find((user) => user.email === 'imported@alooshomal.local')?.id ||
          userList.items[0]?.id ||
          '',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری دسته‌های ایمپورت');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError('ابتدا فایل JSON، CSV یا Excel را انتخاب کنید');
      return;
    }
    if (!ownerId) {
      setError('کاربر مالک کارت‌های ایمپورت‌شده را انتخاب کنید');
      return;
    }
    setImporting(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('ownerUserId', ownerId);
      if (label.trim()) form.append('label', label.trim());
      const result = await api.upload<ImportBatchResult>(
        '/admin/import-batches',
        form,
      );
      setMessage(
        `ایمپورت انجام شد: ${fa(result.imported)} کارت در دسته‌ی «${result.label}» ثبت شد؛ ` +
          'تا تصاحب صاحبشان منتشر نمی‌شوند اما لینک مستقیم دارند.',
      );
      if (result.errors.length) setError(result.errors.join(' | '));
      setLabel('');
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ایمپورت ناموفق بود');
    } finally {
      setImporting(false);
    }
  }

  async function rollbackOne(batch: ImportBatch) {
    if (
      !confirm(
        `همه‌ی ${fa(batch.remaining)} کارت تصاحب‌نشده‌ی دسته‌ی «${batch.label}» حذف شوند؟ این عمل قابل بازگشت نیست.`,
      )
    ) {
      return;
    }
    setBusy(batch.id);
    setError(null);
    setMessage(null);
    try {
      const result = await api.delete<{ deleted: number }>(
        `/admin/import-batches/${batch.id}`,
      );
      setMessage(`${fa(result.deleted)} کارت از دسته‌ی «${batch.label}» حذف شد.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'بازگردانی دسته ناموفق بود');
    } finally {
      setBusy(null);
    }
  }

  async function rollbackAll() {
    if (
      !confirm(
        'همه‌ی کارت‌های ایمپورت‌شده‌ی تصاحب‌نشده (در همه‌ی دسته‌ها) حذف شوند؟ کارت‌هایی که صاحبشان تصاحب کرده‌اند دست‌نخورده می‌مانند.',
      )
    ) {
      return;
    }
    setBusy('all');
    setError(null);
    setMessage(null);
    try {
      const result = await api.delete<{ deleted: number }>('/admin/import-batches');
      setMessage(`${fa(result.deleted)} کارت ایمپورت‌شده حذف شد.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'بازگردانی همه‌ی ایمپورت‌ها ناموفق بود');
    } finally {
      setBusy(null);
    }
  }

  async function download(batchId?: string) {
    setBusy(batchId ?? 'export-all');
    setError(null);
    try {
      await api.download(
        batchId
          ? `/admin/import-batches/${batchId}/export`
          : '/admin/import-batches/export',
        batchId ? `import-batch-${batchId}.csv` : 'imported-cards.csv',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'دانلود فایل ناموفق بود');
    } finally {
      setBusy(null);
    }
  }

  const totals = data?.totals;

  return (
    <div className="indeed-panel p-5">
      <div className="mb-5 rounded-xl border border-dashed border-[var(--vintage-border)] bg-soft/40 p-4">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
          <Upload className="size-5 text-brand" aria-hidden />
          ایمپورت دسته‌ی جدید کسب‌وکار
        </h3>
        <p className="mt-1 text-xs text-muted">
          فایل JSON به‌ترینو (آرایه‌ای از کسب‌وکارها) یا CSV/Excel با ستون‌های «نام،
          شهر، کسب و کار، تلفن، تلفن همراه، محله، آدرس، توضیحات». هر ایمپورت یک دسته‌ی
          جدا با تاریخ و ساعت می‌سازد؛ کارت‌ها منتشرنشده و «تصاحب‌نشده» ثبت می‌شوند تا
          لینکشان برای ارسال به صاحب کسب‌وکار آماده باشد.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            برچسب دسته (اختیاری)
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="ایمپورت دستی — تاریخ"
              className="min-w-52 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm font-semibold text-ink outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            کاربر مالک
            <select
              value={ownerId}
              onChange={(event) => setOwnerId(event.target.value)}
              className="min-w-52 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm font-semibold text-ink outline-none"
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName ?? user.email}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            فایل
            <input
              ref={fileRef}
              type="file"
              accept=".json,.csv,.xlsx,.xls"
              className="rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-1.5 text-xs text-ink file:me-2 file:rounded-md file:border-0 file:bg-soft file:px-2 file:py-1 file:text-xs file:font-bold"
            />
          </label>
          <button
            type="button"
            onClick={() => void upload()}
            disabled={importing}
            className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
          >
            {importing ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Upload className="size-4" aria-hidden />
            )}
            ایمپورت
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
            <CalendarClock className="size-5 text-brand" aria-hidden />
            دسته‌های ایمپورت کسب‌وکار
          </h3>
          <p className="mt-1 text-xs text-muted">
            هر ایمپورت یک جعبه‌ی جدا با تاریخ و ساعت است. کارت‌های ایمپورت‌شده تا
            وقتی صاحبشان آن‌ها را تصاحب نکند منتشر نمی‌شوند، اما لینک مستقیمشان کار
            می‌کند. با هر جعبه می‌توانید فایل شماره تماس + لینک را بگیرید یا همان
            دسته را بازگردانی کنید.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void download()}
            disabled={!totals?.remaining || busy !== null}
            className="indeed-btn indeed-btn-secondary py-2 text-xs disabled:opacity-60"
          >
            <Download className="size-4" aria-hidden />
            CSV همه‌ی لینک‌ها
          </button>
          <button
            type="button"
            onClick={() => void rollbackAll()}
            disabled={!totals?.remaining || busy !== null}
            className="indeed-btn py-2 text-xs font-bold text-red-600 disabled:opacity-60"
          >
            {busy === 'all' ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-4" aria-hidden />
            )}
            بازگردانی همه‌ی ایمپورت‌ها
          </button>
        </div>
      </div>

      {totals ? (
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-lg bg-soft px-3 py-1.5 font-bold text-ink">
            دسته‌ها: {fa(totals.batches)}
          </span>
          <span className="rounded-lg bg-soft px-3 py-1.5 font-bold text-ink">
            کل کارت‌ها: {fa(totals.total)}
          </span>
          <span className="rounded-lg bg-soft px-3 py-1.5 font-bold text-ink">
            در انتظار تصاحب: {fa(totals.remaining)}
          </span>
          <span className="rounded-lg bg-soft px-3 py-1.5 font-bold text-ink">
            تصاحب‌شده: {fa(totals.claimed)}
          </span>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3">
        {data?.items.length ? (
          data.items.map((batch) => (
            <div
              key={batch.id}
              className="rounded-xl border border-[var(--vintage-border)] bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-ink">{batch.label}</p>
                  <p className="mt-1 text-xs text-muted">
                    ایمپورت: {formatJalali(batch.createdAt)} — {timeOf(batch.createdAt)}
                    {batch.source ? ` · منبع: ${batch.source}` : ''}
                  </p>
                  {batch.note ? (
                    <p className="mt-1 text-xs text-muted">{batch.note}</p>
                  ) : null}
                </div>
                <span
                  className={
                    batch.rolledBackAt
                      ? 'rounded-full bg-soft px-2.5 py-1 text-[11px] font-bold text-muted'
                      : batch.remaining > 0
                        ? 'rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700'
                        : 'rounded-full bg-soft px-2.5 py-1 text-[11px] font-bold text-muted'
                  }
                >
                  {batch.rolledBackAt
                    ? 'بازگردانی‌شده'
                    : batch.remaining > 0
                      ? 'فعال'
                      : 'بدون کارت تصاحب‌نشده'}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-lg bg-soft px-2.5 py-1 font-bold text-ink">
                  کل: {fa(batch.total)}
                </span>
                <span className="rounded-lg bg-soft px-2.5 py-1 font-bold text-ink">
                  در انتظار تصاحب: {fa(batch.remaining)}
                </span>
                <span className="rounded-lg bg-soft px-2.5 py-1 font-bold text-ink">
                  تصاحب‌شده: {fa(batch.claimed)}
                </span>
                {batch.rolledBackAt ? (
                  <span className="text-muted">
                    بازگردانی: {formatJalali(batch.rolledBackAt)} — {timeOf(batch.rolledBackAt)}
                    {' · '}
                    {fa(batch.rolledBackCount)} کارت
                  </span>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void download(batch.id)}
                  disabled={!batch.remaining || busy !== null}
                  className="indeed-btn indeed-btn-secondary py-1.5 text-xs disabled:opacity-60"
                >
                  <Download className="size-3.5" aria-hidden />
                  CSV شماره + لینک
                </button>
                <button
                  type="button"
                  onClick={() => void rollbackOne(batch)}
                  disabled={!batch.remaining || busy !== null}
                  className="indeed-btn py-1.5 text-xs font-bold text-red-600 disabled:opacity-60"
                >
                  {busy === batch.id ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <RotateCcw className="size-3.5" aria-hidden />
                  )}
                  بازگردانی این دسته
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-lg bg-soft p-3 text-xs text-muted">
            هنوز هیچ دسته‌ی ایمپورتی ثبت نشده است.
          </p>
        )}
      </div>

      {message ? (
        <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
