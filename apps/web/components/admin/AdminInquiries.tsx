'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';

import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface InquiryRow {
  id: string;
  provider: 'ZOHAL' | 'APIIR';
  serviceKey: string;
  ok: boolean;
  resultCode: number | null;
  httpStatus: number | null;
  message: string | null;
  errorCode: string | null;
  latencyMs: number | null;
  nationalCode: string | null;
  phone: string | null;
  createdAt: string;
  user: { id: string; fullName: string | null; phone: string | null } | null;
}

interface InquiryResponse {
  items: InquiryRow[];
  total: number;
}

const PROVIDER_LABELS: Record<string, string> = {
  ZOHAL: 'زحل',
  APIIR: 'api.ir',
};

function faDateTime(value: string): string {
  return new Date(value).toLocaleString('fa-IR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

/**
 * Admin «استعلام‌ها» panel: every Zohal and api.ir call is stored in its own
 * table, so this list is independent of the feature that triggered it and can
 * be searched by service, user, national code, phone or message.
 */
export function AdminInquiries() {
  const [provider, setProvider] = useState<'ALL' | 'ZOHAL' | 'APIIR'>('ALL');
  const [query, setQuery] = useState('');
  const [data, setData] = useState<InquiryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (q: string, p: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ take: '200' });
      if (q.trim()) params.set('q', q.trim());
      if (p !== 'ALL') params.set('provider', p);
      setData(await api.get<InquiryResponse>(`/admin/inquiries?${params}`));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'بارگذاری استعلام‌ها ناموفق بود');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(query, provider);
  }, [load, query, provider]);

  return (
    <div className="flex flex-col gap-4">
      <div className="indeed-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-ink">
              استعلام‌های زحل و api.ir
            </h2>
            <p className="mt-1 text-xs leading-6 text-muted">
              هر فراخوانی مستقل در دیتابیس ذخیره می‌شود؛ این فهرست کامل با
              جست‌وجو در نام سرویس، کاربر، کد ملی، موبایل و پیام پاسخ است.
            </p>
          </div>
          <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-bold text-brand">
            {(data?.total ?? 0).toLocaleString('fa-IR')} مورد
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <div className="flex gap-1.5">
            {(
              [
                ['ALL', 'همه'],
                ['ZOHAL', 'زحل'],
                ['APIIR', 'api.ir'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setProvider(key)}
                className={cn(
                  'rounded-full px-3 py-1 text-[11px] font-bold',
                  provider === key
                    ? 'bg-brand text-white'
                    : 'bg-surface text-muted ring-1 ring-line',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="relative min-w-[14rem] flex-1">
            <Search
              className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              className="indeed-input pr-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="جست‌وجو در سرویس، کاربر، کد ملی، موبایل یا پیام"
            />
          </label>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="indeed-panel overflow-x-auto p-0">
        {loading ? (
          <p className="flex items-center gap-2 p-5 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            در حال بارگذاری...
          </p>
        ) : (
          <table className="w-full min-w-[48rem] border-collapse text-xs">
            <thead>
              <tr className="text-muted">
                <th className="border-b border-line p-2 text-right">زمان</th>
                <th className="border-b border-line p-2 text-right">سرویس</th>
                <th className="border-b border-line p-2 text-right">کاربر</th>
                <th className="border-b border-line p-2 text-right">کد ملی / موبایل</th>
                <th className="border-b border-line p-2 text-right">وضعیت</th>
                <th className="border-b border-line p-2 text-right">پیام</th>
                <th className="border-b border-line p-2 text-right">تأخیر</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((row) => (
                <tr key={row.id}>
                  <td className="border-b border-line p-2 text-muted">
                    {faDateTime(row.createdAt)}
                  </td>
                  <td className="border-b border-line p-2">
                    <span className="font-bold text-ink">
                      {PROVIDER_LABELS[row.provider] ?? row.provider}
                    </span>
                    <span className="block font-mono text-[10px] text-muted" dir="ltr">
                      {row.serviceKey}
                    </span>
                  </td>
                  <td className="border-b border-line p-2">
                    <span className="text-ink">{row.user?.fullName ?? '—'}</span>
                    <span className="block text-[10px] text-muted" dir="ltr">
                      {row.user?.phone ?? row.phone ?? '—'}
                    </span>
                  </td>
                  <td className="border-b border-line p-2 text-muted" dir="ltr">
                    {row.nationalCode ?? '—'}
                  </td>
                  <td className="border-b border-line p-2">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold',
                        row.ok
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700',
                      )}
                    >
                      {row.ok ? 'موفق' : 'ناموفق'}
                    </span>
                    {row.httpStatus ? (
                      <span className="ms-1 text-[10px] text-muted">
                        HTTP {row.httpStatus}
                      </span>
                    ) : null}
                  </td>
                  <td className="max-w-[18rem] border-b border-line p-2 text-muted">
                    <span className="line-clamp-2">{row.message ?? '—'}</span>
                    {row.errorCode ? (
                      <span className="block text-[10px] text-red-500">
                        {row.errorCode}
                      </span>
                    ) : null}
                  </td>
                  <td className="border-b border-line p-2 text-muted">
                    {row.latencyMs !== null ? `${row.latencyMs}ms` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && (data?.items.length ?? 0) === 0 ? (
          <p className="p-5 text-sm text-muted">استعلامی یافت نشد.</p>
        ) : null}
      </div>
    </div>
  );
}
