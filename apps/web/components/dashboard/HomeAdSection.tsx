'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, IdCard, Megaphone, Search, Sparkles } from 'lucide-react';

import { Pagination } from '@/components/ui/Pagination';
import {
  api,
  type AdRequest,
  type AdTargetItem,
  type AdTargetKind,
  type AdsOverview,
} from '@/lib/api';
import { cn } from '@/lib/utils';

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

interface RowProps {
  item: AdTargetItem;
  kind: AdTargetKind;
  request: AdRequest | undefined;
  busy: boolean;
  onRequest: (kind: AdTargetKind, item: AdTargetItem) => void;
}

function TargetRow({ item, kind, request, busy, onRequest }: RowProps) {
  const pending = request?.status === 'PENDING';
  const active = request?.displayState === 'ACTIVE';

  return (
    <div className="indeed-panel flex flex-wrap items-center justify-between gap-4 p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-base font-extrabold text-ink">{item.fullName}</h3>
          {active ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
              در حال نمایش
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-sm text-muted">
          {item.jobTitle ?? '—'}
          {item.company ? ` — ${item.company}` : ''}
        </p>
        {request ? (
          <span
            className={cn(
              'mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold',
              request.displayState === 'ACTIVE'
                ? 'bg-green-50 text-green-700'
                : request.displayState === 'REJECTED' || request.displayState === 'EXPIRED'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-amber-50 text-amber-700',
            )}
          >
            {DISPLAY_LABELS[request.displayState ?? request.status] ?? request.status}
            {request.displayState === 'SCHEDULED' && request.startedAt
              ? ` • شروع از ${faDate(request.startedAt)}`
              : ''}
            {request.displayState === 'ACTIVE' && request.endsAt
              ? ` • تا ${faDate(request.endsAt)}`
              : ''}
            {request.displayState === 'EXPIRED' && request.endsAt
              ? ` • ${faDate(request.endsAt)}`
              : ''}
          </span>
        ) : null}
      </div>

      <button
        type="button"
        disabled={busy || pending || !item.isPublished}
        onClick={() => onRequest(kind, item)}
        className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
      >
        <Megaphone className="size-4" aria-hidden />
        {pending ? 'در انتظار تأیید' : !item.isPublished ? 'منتشر نشده' : 'ثبت درخواست تبلیغ'}
      </button>
    </div>
  );
}

/**
 * «تبلیغ در صفحه اصلی» — pick one of the user's own cards/biolinks to rotate in
 * the home-page ad box. The pick list is searchable + paginated so it stays
 * usable with hundreds of items. Extracted from `/dashboard/ads` so it can
 * render as a tab next to «تبلیغ در دایرکتوری».
 */
export function HomeAdSection() {
  const [data, setData] = useState<AdsOverview | null>(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (query) params.set('q', query);
      setData(await api.get<AdsOverview>(`/ads/overview?${params.toString()}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    void load();
  }, [load]);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    setQuery(draft.trim());
  }

  async function requestAd(kind: AdTargetKind, item: AdTargetItem) {
    setBusyId(item.id);
    setError(null);
    setMessage(null);
    try {
      await api.post('/ads/request', { kind, targetId: item.id });
      setMessage('درخواست تبلیغ ثبت شد. پس از تأیید مدیر در صفحه اصلی نمایش داده می‌شود.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت درخواست ناموفق بود');
    } finally {
      setBusyId(null);
    }
  }

  const requests = data?.requests ?? [];
  const requestFor = (kind: AdTargetKind, id: string) =>
    requests.find((request) => request.kind === kind && request.targetId === id);
  const total = data?.meta
    ? Math.max(data.meta.biolinkTotal, data.meta.cardTotal)
    : (data?.businessCards.length ?? 0) + (data?.biolinks.length ?? 0);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        یکی از کارت‌های ویزیت یا بیولینک‌های خود را برای نمایش در کادر تبلیغات صفحه اصلی
        انتخاب کنید. پس از تأیید مدیر، تبلیغ شما برای مدت مشخص‌شده نمایش داده می‌شود.
      </p>

      {data?.settings ? (
        <div className="indeed-panel flex flex-wrap items-center gap-4 p-4 text-sm">
          <span className="inline-flex items-center gap-1.5 text-muted">
            <Sparkles className="size-4 text-brand" aria-hidden />
            مدت نمایش هر تبلیغ:{' '}
            <b className="text-ink">{data.settings.durationDays.toLocaleString('fa-IR')} روز</b>
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted">
            <Megaphone className="size-4 text-brand" aria-hidden />
            تعداد تبلیغ در روز:{' '}
            <b className="text-ink">{data.settings.dailySlots.toLocaleString('fa-IR')}</b>
          </span>
        </div>
      ) : null}

      <form onSubmit={submitSearch} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex flex-1 items-center">
          <Search className="pointer-events-none absolute end-3 size-4 text-muted" aria-hidden />
          <input
            className="h-11 w-full rounded-lg border border-[var(--vintage-border)] bg-white px-3 pe-10 text-sm outline-none focus:border-brand"
            placeholder="جستجو در عنوان، شغل یا شرکت"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </div>
        <button type="submit" className="indeed-btn indeed-btn-primary h-11 py-0 text-sm">
          جستجو
        </button>
      </form>

      {message ? (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-muted">در حال بارگذاری...</p>
      ) : total === 0 ? (
        <div className="indeed-panel p-10 text-center">
          <p className="text-lg font-bold text-ink">
            {query ? 'موردی یافت نشد' : 'هنوز کارتی نساخته‌اید'}
          </p>
          <p className="mt-2 text-sm text-muted">
            {query
              ? 'عبارت جستجو را تغییر دهید.'
              : 'برای ثبت تبلیغ ابتدا یک بیولینک یا کارت ویزیت بسازید و منتشر کنید.'}
          </p>
          {!query ? (
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/dashboard/business-cards" className="indeed-btn indeed-btn-primary py-2 text-sm">
                کارت‌های ویزیت من
              </Link>
              <Link href="/dashboard/biolinks" className="indeed-btn indeed-btn-secondary py-2 text-sm">
                بیولینک‌های من
              </Link>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
              <BadgeCheck className="size-4 text-brand" aria-hidden />
              کارت‌های ویزیت
            </h3>
            {data?.businessCards.length ? (
              data.businessCards.map((item) => (
                <TargetRow
                  key={item.id}
                  item={item}
                  kind="BUSINESS_CARD"
                  request={requestFor('BUSINESS_CARD', item.id)}
                  busy={busyId === item.id}
                  onRequest={requestAd}
                />
              ))
            ) : (
              <p className="indeed-panel p-4 text-sm text-muted">
                کارت ویزیتی برای نمایش نیست.
              </p>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
              <IdCard className="size-4 text-brand" aria-hidden />
              بیولینک‌ها
            </h3>
            {data?.biolinks.length ? (
              data.biolinks.map((item) => (
                <TargetRow
                  key={item.id}
                  item={item}
                  kind="BIOLINK"
                  request={requestFor('BIOLINK', item.id)}
                  busy={busyId === item.id}
                  onRequest={requestAd}
                />
              ))
            ) : (
              <p className="indeed-panel p-4 text-sm text-muted">
                بیولینکی برای نمایش نیست.
              </p>
            )}
          </section>

          {data?.meta ? (
            <Pagination
              meta={{
                page: data.meta.page,
                limit: data.meta.limit,
                total: Math.max(data.meta.biolinkTotal, data.meta.cardTotal),
                totalPages: Math.max(
                  data.meta.biolinkTotalPages,
                  data.meta.cardTotalPages,
                ),
                hasNext: data.meta.hasNext,
                hasPrev: data.meta.hasPrev,
              }}
              onPage={setPage}
            />
          ) : null}
        </>
      )}

      {requests.length ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-extrabold text-ink">تاریخچه درخواست‌ها</h3>
          <div className="indeed-panel divide-y divide-[var(--vintage-border)]">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
              >
                <span className="font-bold text-ink">
                  {request.target?.fullName ?? '—'}
                  <span className="ms-2 text-xs text-muted">
                    {request.kind === 'BUSINESS_CARD' ? 'کارت ویزیت' : 'بیولینک'}
                  </span>
                </span>
                <span className="text-xs text-muted">
                  درخواست: {faDate(request.requestedAt)}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-bold',
                    request.displayState === 'ACTIVE'
                      ? 'bg-green-50 text-green-700'
                      : request.displayState === 'REJECTED' ||
                          request.displayState === 'EXPIRED'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-amber-50 text-amber-700',
                  )}
                >
                  {DISPLAY_LABELS[request.displayState ?? request.status] ?? request.status}
                  {request.displayState === 'SCHEDULED' && request.startedAt
                    ? ` • ${faDate(request.startedAt)} تا ${request.endsAt ? faDate(request.endsAt) : '—'}`
                    : ''}
                  {request.displayState === 'ACTIVE' && request.endsAt
                    ? ` • تا ${faDate(request.endsAt)}`
                    : ''}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
