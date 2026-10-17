'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BadgeCheck,
  Eye,
  Heart,
  IdCard,
  ListOrdered,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

import { BoostBadge } from '@/components/ui/BoostBadge';
import { Pagination } from '@/components/ui/Pagination';
import {
  api,
  type BoostOverview,
  type BoostRequest,
  type BoostTargetItem,
  type BoostTargetKind,
} from '@/lib/api';
import { cn } from '@/lib/utils';

const BOOST_STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار تأیید',
  APPROVED: 'تأییدشده',
  REJECTED: 'ردشده',
};

interface RowProps {
  item: BoostTargetItem;
  kind: BoostTargetKind;
  requests: BoostRequest[];
  busy: boolean;
  onBoost: (kind: BoostTargetKind, item: BoostTargetItem) => void;
}

function TargetRow({ item, kind, requests, busy, onBoost }: RowProps) {
  const request = requests.find(
    (entry) => entry.kind === kind && entry.targetId === item.id,
  );
  const boostedUntil = item.boostedUntil ? new Date(item.boostedUntil) : null;
  const isBoosted = boostedUntil && boostedUntil > new Date();
  const rank = item.rank?.rank ?? null;
  const rankPage = item.rank?.page ?? null;
  const lastBoostedAt = item.lastBoostedAt ? new Date(item.lastBoostedAt) : null;

  return (
    <div className="indeed-panel flex flex-wrap items-center justify-between gap-4 p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-base font-extrabold text-ink">{item.fullName}</h3>
          {isBoosted ? <BoostBadge /> : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold',
              rank === 1 ? 'bg-amber-100 text-amber-700' : 'bg-soft text-ink',
            )}
          >
            <ListOrdered className="size-3.5" aria-hidden />
            {rank ? (
              <>
                ردیف {rank.toLocaleString('fa-IR')}
                {rankPage ? ` • صفحه ${rankPage.toLocaleString('fa-IR')}` : ''}
              </>
            ) : (
              'خارج از لیست'
            )}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="size-3.5" aria-hidden />
            {item.views.toLocaleString('fa-IR')} بازدید
          </span>
          <span className="inline-flex items-center gap-1">
            <Heart className="size-3.5" aria-hidden />
            {item.likes.toLocaleString('fa-IR')} لایک
          </span>
          {lastBoostedAt ? (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <Sparkles className="size-3.5" aria-hidden />
              آخرین پله: {lastBoostedAt.toLocaleDateString('fa-IR')}
            </span>
          ) : null}
          {request && request.status !== 'REJECTED' ? (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 font-bold',
                request.status === 'APPROVED'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-amber-50 text-amber-700',
              )}
            >
              {BOOST_STATUS_LABELS[request.status] ?? request.status}
            </span>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        disabled={busy || request?.status === 'PENDING' || !item.isPublished}
        onClick={() => onBoost(kind, item)}
        className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
      >
        <TrendingUp className="size-4" aria-hidden />
        {request?.status === 'PENDING'
          ? 'در انتظار تأیید'
          : !item.isPublished
            ? 'منتشر نشده'
            : 'درخواست پله'}
      </button>
    </div>
  );
}

/**
 * «تبلیغ در دایرکتوری» — a user asks the admin to lift one of their own cards
 * (or biolinks) to the top of its directory slice. Extracted from the standalone
 * `/dashboard/boost` page so it can also render as a tab inside «تبلیغات».
 */
export function DirectoryAdSection() {
  const [data, setData] = useState<BoostOverview | null>(null);
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
      const overview = await api.get<BoostOverview>(
        `/boosts/overview?${params.toString()}`,
      );
      setData(overview);
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

  async function boost(kind: BoostTargetKind, item: BoostTargetItem) {
    setBusyId(item.id);
    setError(null);
    setMessage(null);
    try {
      await api.post('/boosts/request', { kind, targetId: item.id, feature: 'POLE' });
      setMessage('درخواست پله ثبت شد. پس از تأیید مدیر، این مورد در صدر لیست دایرکتوری همان شهر و کسب‌وکار نمایش داده می‌شود.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت درخواست ناموفق بود');
    } finally {
      setBusyId(null);
    }
  }

  const requests = data?.requests ?? [];
  const total = data?.meta
    ? Math.max(data.meta.biolinkTotal, data.meta.cardTotal)
    : (data?.biolinks.length ?? 0) + (data?.businessCards.length ?? 0);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        با «پله» یکی از کارت‌ها یا بیولینک‌های خود را تبلیغ کنید؛ پس از تأیید مدیر، مورد
        انتخابی با تگ «تبلیغات» تنها هنگام استفادهٔ بازدیدکننده از همان فیلتر شهر و
        کسب‌وکار، در صدر لیست دایرکتوری نمایش داده می‌شود.
      </p>

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
              : 'برای استفاده از «پله» ابتدا یک بیولینک یا کارت ویزیت بسازید و منتشر کنید.'}
          </p>
        </div>
      ) : (
        <>
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
                  requests={requests}
                  busy={busyId === item.id}
                  onBoost={boost}
                />
              ))
            ) : (
              <p className="indeed-panel p-4 text-sm text-muted">
                بیولینکی برای نمایش نیست.
              </p>
            )}
          </section>

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
                  requests={requests}
                  busy={busyId === item.id}
                  onBoost={boost}
                />
              ))
            ) : (
              <p className="indeed-panel p-4 text-sm text-muted">
                کارت ویزیتی برای نمایش نیست.
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
    </div>
  );
}
