'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Eye,
  Heart,
  IdCard,
  ImagePlus,
  ListOrdered,
  Megaphone,
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
  type BoostStatus,
  type BoostTargetItem,
  type BoostTargetKind,
} from '@/lib/api';
import { cn } from '@/lib/utils';

type Tab = 'biolinks' | 'business-cards' | 'feeds';

const TABS: Array<{ key: Tab; label: string; icon: typeof IdCard }> = [
  { key: 'biolinks', label: 'بیولینک‌ها', icon: IdCard },
  { key: 'business-cards', label: 'کارت‌های ویزیت', icon: BadgeCheck },
  { key: 'feeds', label: 'فیدها', icon: ImagePlus },
];

const TAB_KIND: Record<Tab, BoostTargetKind> = {
  biolinks: 'BIOLINK',
  'business-cards': 'BUSINESS_CARD',
  feeds: 'FEED',
};

const BOOST_STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار تأیید',
  APPROVED: 'تأییدشده',
  REJECTED: 'ردشده',
};

/** Persian labels for an ad request's display window (see `AdDisplayState`). */
const AD_DISPLAY_LABELS: Record<string, string> = {
  PENDING: 'در انتظار تأیید',
  SCHEDULED: 'در انتظار نمایش',
  ACTIVE: 'در حال نمایش',
  EXPIRED: 'پایان‌یافته',
  REJECTED: 'ردشده',
};

function faDate(value: string) {
  return new Date(value).toLocaleDateString('fa-IR');
}

interface Props {
  data: BoostOverview | null;
  loading: boolean;
  page: number;
  onPage: (page: number) => void;
  onReload: () => void;
  onError: (message: string | null) => void;
  onMessage: (message: string | null) => void;
}

/**
 * Merged «افزایش بازدید» table: one row per owned item (biolink, business card
 * or feed post) with the two advertising actions — «پله» (lift to the top of
 * its directory) and «تبلیغ صفحه اول» (feature in the home-page ad box) — plus
 * the request history. Replaces the old card grids of both «افزایش بازدید» and
 * «تبلیغات».
 */
export function BoostTable({
  data,
  loading,
  page,
  onPage,
  onReload,
  onError,
  onMessage,
}: Props) {
  const [tab, setTab] = useState<Tab>('biolinks');
  const [busy, setBusy] = useState<string | null>(null);
  const [localBoost, setLocalBoost] = useState<Record<string, BoostStatus>>({});
  const [localAd, setLocalAd] = useState<Record<string, BoostStatus>>({});
  const [localDirectoryAd, setLocalDirectoryAd] = useState<
    Record<string, BoostStatus>
  >({});

  const rows: BoostTargetItem[] =
    tab === 'biolinks'
      ? data?.biolinks ?? []
      : tab === 'business-cards'
        ? data?.businessCards ?? []
        : data?.feeds ?? [];

  const requestFor = (kind: BoostTargetKind, id: string): BoostRequest | undefined =>
    data?.requests.find((entry) => entry.kind === kind && entry.targetId === id);

  async function requestBoost(item: BoostTargetItem) {
    const kind = TAB_KIND[tab];
    setBusy(`boost:${item.id}`);
    onError(null);
    onMessage(null);
    try {
      await api.post('/boosts/request', { kind, targetId: item.id, feature: 'POLE' });
      setLocalBoost((prev) => ({ ...prev, [`${kind}:${item.id}`]: 'PENDING' }));
      onMessage('درخواست پله ثبت شد. پس از تأیید مدیر در صدر لیست دایرکتوری نمایش داده می‌شود.');
      onReload();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'ثبت درخواست پله ناموفق بود');
    } finally {
      setBusy(null);
    }
  }

  async function requestAd(item: BoostTargetItem) {
    const kind = TAB_KIND[tab];
    setBusy(`ad:${item.id}`);
    onError(null);
    onMessage(null);
    try {
      await api.post('/ads/request', { kind, targetId: item.id });
      setLocalAd((prev) => ({ ...prev, [`${kind}:${item.id}`]: 'PENDING' }));
      onMessage('درخواست تبلیغ ثبت شد. پس از تأیید مدیر در صفحه اصلی نمایش داده می‌شود.');
      onReload();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'ثبت درخواست تبلیغ ناموفق بود');
    } finally {
      setBusy(null);
    }
  }

  /** «تبلیغ در دایرکتوری» — a paid, targeted ad (distinct from «پله»). */
  async function requestDirectoryAd(item: BoostTargetItem) {
    const kind = TAB_KIND[tab];
    setBusy(`dir:${item.id}`);
    onError(null);
    onMessage(null);
    try {
      await api.post('/ads/request', {
        kind,
        targetId: item.id,
        placement: 'DIRECTORY',
      });
      setLocalDirectoryAd((prev) => ({ ...prev, [`${kind}:${item.id}`]: 'PENDING' }));
      onMessage(
        'درخواست تبلیغ در دایرکتوری ثبت شد. پس از تأیید مدیر در صدر لیست همان شهر/کسب‌وکار نمایش داده می‌شود.',
      );
      onReload();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'ثبت درخواست تبلیغ دایرکتوری ناموفق بود');
    } finally {
      setBusy(null);
    }
  }

  const total = data?.meta
    ? Math.max(data.meta.biolinkTotal, data.meta.cardTotal, data.meta.feedTotal)
    : rows.length;

  const meta = data?.meta
    ? {
        page: data.meta.page,
        limit: data.meta.limit,
        total,
        totalPages: Math.max(data.meta.biolinkTotalPages, data.meta.cardTotalPages, data.meta.feedTotalPages),
        hasNext: data.meta.hasNext,
        hasPrev: data.meta.hasPrev,
      }
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold transition',
              tab === key
                ? 'border-brand bg-brand-light text-brand'
                : 'border-[var(--vintage-border)] bg-white text-muted hover:border-brand',
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted">در حال بارگذاری...</p>
      ) : rows.length === 0 ? (
        <div className="indeed-panel p-10 text-center">
          <p className="text-lg font-bold text-ink">موردی برای نمایش نیست</p>
          <p className="mt-2 text-sm text-muted">
            برای ثبت تبلیغ/پله ابتدا یک مورد بسازید و منتشر کنید.
          </p>
        </div>
      ) : (
        <div className="indeed-panel overflow-x-auto">
          <table className="w-full min-w-[60rem] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-dashed border-[var(--vintage-accent-hover)] text-right text-xs text-muted">
                <th className="px-3 py-3 font-bold">عنوان</th>
                <th className="px-3 py-3 font-bold">وضعیت</th>
                <th className="px-3 py-3 font-bold">جایگاه</th>
                <th className="px-3 py-3 font-bold">بازدید</th>
                <th className="px-3 py-3 font-bold">لایک</th>
                <th className="px-3 py-3 font-bold">آخرین پله</th>
                <th className="px-3 py-3 font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const kind = TAB_KIND[tab];
                const key = `${kind}:${item.id}`;
                const request = requestFor(kind, item.id);
                const boostStatus =
                  localBoost[key] ?? request?.status ?? null;
                const adStatus = localAd[key] ?? item.adStatus ?? null;
                const boostedUntil = item.boostedUntil ? new Date(item.boostedUntil) : null;
                const directoryAdStatus =
                  localDirectoryAd[key] ?? item.directoryAdStatus ?? null;
                const adDirectoryUntil = item.adDirectoryUntil
                  ? new Date(item.adDirectoryUntil)
                  : null;
                const isDirectoryAd =
                  adDirectoryUntil && adDirectoryUntil > new Date();
                const isBoosted =
                  !isDirectoryAd && boostedUntil && boostedUntil > new Date();
                const rank = item.rank?.rank ?? null;
                const rankPage = item.rank?.page ?? null;
                return (
                  <tr
                    key={item.id}
                    className="border-b border-dashed border-[var(--vintage-border)] last:border-b-0"
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 truncate font-bold text-ink">
                          {item.fullName}
                        </span>
                        {isDirectoryAd ? (
                          <BoostBadge
                            label="تبلیغات"
                            title="این مورد تبلیغ هدفمند در دایرکتوری است"
                          />
                        ) : isBoosted ? (
                          <BoostBadge />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          'rounded-md border px-2 py-0.5 text-[11px] font-bold',
                          item.isPublished
                            ? 'badge-open'
                            : 'badge-progress',
                        )}
                      >
                        {item.isPublished ? 'منتشرشده' : 'منتشرنشده'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
                          rank === 1 ? 'bg-amber-100 text-amber-700' : 'bg-soft text-ink',
                        )}
                      >
                        <ListOrdered className="size-3.5" aria-hidden />
                        {rank ? (
                          <>
                            ردیف {rank.toLocaleString('fa-IR')}
                            {rankPage ? ` • ص${rankPage.toLocaleString('fa-IR')}` : ''}
                          </>
                        ) : (
                          '—'
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-muted">
                        <Eye className="size-3.5 text-sky-500" aria-hidden />
                        {(item.views ?? 0).toLocaleString('fa-IR')}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-muted">
                        <Heart className="size-3.5 text-red-500" aria-hidden />
                        {(item.likes ?? 0).toLocaleString('fa-IR')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted">
                      {item.lastBoostedAt ? faDate(item.lastBoostedAt) : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          disabled={busy === `boost:${item.id}` || boostStatus === 'PENDING' || !item.isPublished}
                          onClick={() => requestBoost(item)}
                          title={!item.isPublished ? 'فقط موارد منتشرشده قابل پله هستند' : 'درخواست پله (رسیدن به صدر لیست دایرکتوری)'}
                          className={cn(
                            'indeed-btn py-1.5 text-xs',
                            boostStatus === 'PENDING'
                              ? 'border border-amber-200 bg-amber-50 text-amber-600'
                              : 'indeed-btn-secondary',
                          )}
                        >
                          <TrendingUp className="size-3.5" aria-hidden />
                          {boostStatus === 'PENDING'
                            ? 'پله: در انتظار'
                            : boostStatus === 'APPROVED'
                              ? BOOST_STATUS_LABELS.APPROVED
                              : 'پله'}
                        </button>
                        <button
                          type="button"
                          disabled={
                            busy === `dir:${item.id}` ||
                            directoryAdStatus === 'PENDING' ||
                            !item.isPublished
                          }
                          onClick={() => requestDirectoryAd(item)}
                          title={
                            !item.isPublished
                              ? 'فقط موارد منتشرشده قابل تبلیغ هستند'
                              : 'درخواست تبلیغ در صدر لیست دایرکتوری شهر/کسب‌وکار'
                          }
                          className={cn(
                            'indeed-btn py-1.5 text-xs',
                            directoryAdStatus === 'PENDING'
                              ? 'border border-amber-200 bg-amber-50 text-amber-600'
                              : 'indeed-btn-secondary',
                          )}
                        >
                          <ListOrdered className="size-3.5" aria-hidden />
                          {directoryAdStatus === 'PENDING'
                            ? 'دایرکتوری: در انتظار'
                            : directoryAdStatus === 'APPROVED'
                              ? 'تبلیغ دایرکتوری تأییدشده'
                              : 'تبلیغ در دایرکتوری'}
                        </button>
                        <button
                          type="button"
                          disabled={busy === `ad:${item.id}` || adStatus === 'PENDING' || !item.isPublished}
                          onClick={() => requestAd(item)}
                          title={!item.isPublished ? 'فقط موارد منتشرشده قابل تبلیغ هستند' : 'درخواست تبلیغ در صفحه اول'}
                          className={cn(
                            'indeed-btn py-1.5 text-xs',
                            adStatus === 'PENDING'
                              ? 'border border-amber-200 bg-amber-50 text-amber-600'
                              : 'indeed-btn-secondary',
                          )}
                        >
                          <Megaphone className="size-3.5" aria-hidden />
                          {adStatus === 'PENDING'
                            ? 'تبلیغ: در انتظار'
                            : adStatus === 'APPROVED'
                              ? 'تبلیغ تأییدشده'
                              : 'تبلیغ در صفحه اول'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {meta ? <Pagination meta={meta} onPage={onPage} /> : null}

      {data?.requests.length ? (
        <section className="flex flex-col gap-3">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
            <Sparkles className="size-4 text-brand" aria-hidden />
            تاریخچه درخواست‌های پله
          </h3>
          <div className="indeed-panel divide-y divide-[var(--vintage-border)]">
            {data.requests.map((request) => (
              <div
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
              >
                <span className="font-bold text-ink">
                  {request.target?.fullName ?? '—'}
                  <span className="ms-2 text-xs text-muted">
                    {request.kind === 'BIOLINK'
                      ? 'بیولینک'
                      : request.kind === 'FEED'
                        ? 'فید'
                        : 'کارت ویزیت'}
                  </span>
                </span>
                <span className="text-xs text-muted">
                  درخواست: {faDate(request.requestedAt)}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-bold',
                    request.status === 'APPROVED'
                      ? 'bg-green-50 text-green-700'
                      : request.status === 'REJECTED'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-amber-50 text-amber-700',
                  )}
                >
                  {BOOST_STATUS_LABELS[request.status] ?? request.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {data?.adRequests?.length ? (
        <section className="flex flex-col gap-3">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
            <Megaphone className="size-4 text-brand" aria-hidden />
            تاریخچه درخواست‌های تبلیغ
          </h3>
          <div className="indeed-panel divide-y divide-[var(--vintage-border)]">
            {data.adRequests.map((request) => (
              <div
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
              >
                <span className="font-bold text-ink">
                  {request.target?.fullName ?? '—'}
                  <span className="ms-2 text-xs text-muted">
                    {request.kind === 'BIOLINK'
                      ? 'بیولینک'
                      : request.kind === 'FEED'
                        ? 'فید'
                        : 'کارت ویزیت'}
                    {' • '}
                    {request.placement === 'DIRECTORY'
                      ? 'دایرکتوری'
                      : 'صفحه اول'}
                  </span>
                </span>
                <span className="text-xs text-muted">
                  درخواست: {faDate(request.requestedAt)}
                  {request.displayState === 'ACTIVE' && request.endsAt
                    ? ` • تا ${faDate(request.endsAt)}`
                    : ''}
                  {request.displayState === 'SCHEDULED' && request.startedAt
                    ? ` • شروع از ${faDate(request.startedAt)}`
                    : ''}
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
                  {AD_DISPLAY_LABELS[request.displayState ?? request.status] ??
                    request.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function BoostSearchForm({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
      <div className="relative flex flex-1 items-center">
        <Search className="pointer-events-none absolute end-3 size-4 text-muted" aria-hidden />
        <input
          className="h-11 w-full rounded-lg border border-[var(--vintage-border)] bg-white px-3 pe-10 text-sm outline-none focus:border-brand"
          placeholder="جستجو در عنوان، شغل یا شرکت"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      <button type="submit" className="indeed-btn indeed-btn-primary h-11 py-0 text-sm">
        جستجو
      </button>
    </form>
  );
}
