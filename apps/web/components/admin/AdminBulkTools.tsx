'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, FlaskConical, Lock, Trash2, Unlock, Upload } from 'lucide-react';

import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Counts {
  biolinks: number;
  businessCards: number;
}

interface ImportResult {
  kind: 'BIOLINK' | 'BUSINESS_CARD';
  imported: number;
  skipped: number;
  errors: string[];
}

interface SettingsPayload {
  allowBiolinkCreation: boolean;
  allowBusinessCardCreation: boolean;
}

interface UserOption {
  id: string;
  email: string;
  fullName: string | null;
}

type Kind = 'BIOLINK' | 'BUSINESS_CARD';

function toFa(value: number) {
  return value.toLocaleString('fa-IR');
}

/**
 * Load-testing toolbox for the admin: bulk-import thousands of test rows from
 * an Excel/CSV file, wipe them in one click, and pause user creation so no real
 * content slips in while testing. Imported rows carry the `isTestData` tag, and
 * bulk delete only ever removes tagged rows.
 */
export function AdminBulkTools() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [locks, setLocks] = useState<SettingsPayload | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [ownerId, setOwnerId] = useState('');
  const [kind, setKind] = useState<Kind>('BIOLINK');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const [c, s, u] = await Promise.all([
        api.get<Counts>('/admin/bulk/counts'),
        api.get<SettingsPayload>('/admin/settings'),
        api.get<{ items: UserOption[] }>('/admin/users?limit=100'),
      ]);
      setCounts(c);
      setLocks({
        allowBiolinkCreation: s.allowBiolinkCreation,
        allowBusinessCardCreation: s.allowBusinessCardCreation,
      });
      setUsers(u.items);
      setOwnerId((prev) => prev || u.items[0]?.id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری ابزارها');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleLock(key: keyof SettingsPayload) {
    if (!locks) return;
    const next = { ...locks, [key]: !locks[key] };
    setLocks(next);
    setBusy(true);
    setError(null);
    try {
      const saved = await api.patch<SettingsPayload>('/admin/settings', {
        [key]: next[key],
      });
      setLocks({
        allowBiolinkCreation: saved.allowBiolinkCreation,
        allowBusinessCardCreation: saved.allowBusinessCardCreation,
      });
      setMessage('وضعیت قفل ساخت ذخیره شد.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره ناموفق بود');
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError('ابتدا یک فایل اکسل یا CSV انتخاب کنید');
      return;
    }
    if (!ownerId) {
      setError('کاربر مالک ردیف‌ها را انتخاب کنید');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('kind', kind);
      form.append('ownerUserId', ownerId);
      const result = await api.upload<ImportResult>('/admin/bulk/import', form);
      setMessage(
        'ایمپورت انجام شد: ' +
          toFa(result.imported) +
          ' ردیف افزوده شد' +
          (result.skipped ? '، ' + toFa(result.skipped) + ' ردیف رد شد.' : '.'),
      );
      if (result.errors.length) setError(result.errors.join(' | '));
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ایمپورت ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  async function removeTestData(scope: Kind | 'ALL') {
    if (!confirm('همه‌ی ردیف‌های تستی ایمپورت‌شده حذف شوند؟ این عمل قابل بازگشت نیست.')) {
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.delete<{ deleted: number }>(
        '/admin/bulk/test-data?kind=' + scope,
      );
      setMessage(toFa(result.deleted) + ' ردیف تستی حذف شد.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  function downloadTemplate() {
    const header = 'نام,عنوان شغلی,شرکت,شهر,کسب و کار,تلفن,ایمیل,وبسایت,آدرس\n';
    const sample =
      'علی رضایی,برنامه‌نویس,شرکت نمونه,تهران,فناوری اطلاعات,09120000000,ali@example.com,example.com,تهران\n';
    const blob = new Blob(['\uFEFF' + header + sample], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'alooshomal-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="indeed-panel p-5">
        <div className="flex items-center gap-2">
          <Lock className="size-5 text-brand" aria-hidden />
          <h3 className="text-sm font-extrabold text-ink">قفل ساخت (حالت تست)</h3>
        </div>
        <p className="mt-1 text-xs text-muted">
          در حین تست با هزاران ردیف ایمپورت‌شده، ساخت واقعی را خاموش کنید تا کارت یک کاربر
          واقعی بین داده‌های تستی گم نشود.
        </p>
        {locks ? (
          <div className="mt-4 flex flex-col divide-y divide-dashed divide-[var(--vintage-border)]">
            {(
              [
                ['allowBiolinkCreation', 'ساخت بیولینک توسط کاربران'],
                ['allowBusinessCardCreation', 'ساخت کارت ویزیت توسط کاربران'],
              ] as Array<[keyof SettingsPayload, string]>
            ).map(([key, label]) => {
              const enabled = locks[key];
              return (
                <label
                  key={key}
                  className="flex cursor-pointer items-center justify-between gap-3 py-2.5"
                >
                  <span className="flex items-center gap-2 text-sm font-bold text-ink">
                    {enabled ? (
                      <Unlock className="size-4 text-emerald-600" aria-hidden />
                    ) : (
                      <Lock className="size-4 text-red-500" aria-hidden />
                    )}
                    {label}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    onClick={() => void toggleLock(key)}
                    disabled={busy}
                    className={cn(
                      'relative h-6 w-11 shrink-0 rounded-full border transition disabled:opacity-60',
                      enabled
                        ? 'border-brand bg-brand'
                        : 'border-[var(--vintage-border)] bg-white',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 size-4.5 rounded-full bg-white shadow transition-all',
                        enabled ? 'start-0.5' : 'start-5.5',
                      )}
                    />
                  </button>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">در حال بارگذاری...</p>
        )}
      </div>

      <div className="indeed-panel p-5">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-5 text-brand" aria-hidden />
          <h3 className="text-sm font-extrabold text-ink">ایمپورت گروهی (تست)</h3>
        </div>
        <p className="mt-1 text-xs text-muted">
          فایل اکسل (xlsx) یا CSV با ستون‌های «نام، عنوان شغلی، شرکت، شهر، کسب و کار، تلفن،
          ایمیل، وبسایت، آدرس». ستون «نام» الزامی است؛ بقیه اختیاری.
        </p>
        <button
          type="button"
          onClick={downloadTemplate}
          className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
        >
          <Download className="size-3.5" aria-hidden />
          دانلود فایل نمونه
        </button>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            نوع
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as Kind)}
              className="rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm font-semibold text-ink outline-none"
            >
              <option value="BIOLINK">بیولینک</option>
              <option value="BUSINESS_CARD">کارت ویزیت</option>
            </select>
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
              accept=".xlsx,.xls,.csv"
              className="rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-1.5 text-xs text-ink file:me-2 file:rounded-md file:border-0 file:bg-soft file:px-2 file:py-1 file:text-xs file:font-bold"
            />
          </label>
          <button
            type="button"
            onClick={upload}
            disabled={busy}
            className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
          >
            <Upload className="size-4" aria-hidden />
            ایمپورت
          </button>
        </div>
      </div>

      <div className="indeed-panel p-5">
        <div className="flex items-center gap-2">
          <Trash2 className="size-5 text-red-500" aria-hidden />
          <h3 className="text-sm font-extrabold text-ink">داده‌های تستی</h3>
        </div>
        <p className="mt-1 text-xs text-muted">
          تعداد فعلی ردیف‌های ایمپورت‌شده (برچسب‌خورده به‌عنوان تست) و حذف گروهی آن‌ها. حذف
          فقط روی همین ردیف‌ها اعمال می‌شود و به محتوای واقعی کاربران کاری ندارد.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="rounded-lg bg-soft px-3 py-1.5 text-xs font-bold text-ink">
            بیولینک تستی: {counts ? toFa(counts.biolinks) : '…'}
          </span>
          <span className="rounded-lg bg-soft px-3 py-1.5 text-xs font-bold text-ink">
            کارت ویزیت تستی: {counts ? toFa(counts.businessCards) : '…'}
          </span>
          <button
            type="button"
            onClick={() => void removeTestData('ALL')}
            disabled={busy}
            className="indeed-btn py-2 text-sm font-bold text-red-600 disabled:opacity-60"
          >
            <Trash2 className="size-4" aria-hidden />
            حذف همه‌ی داده‌های تستی
          </button>
        </div>
      </div>

      {message ? (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
