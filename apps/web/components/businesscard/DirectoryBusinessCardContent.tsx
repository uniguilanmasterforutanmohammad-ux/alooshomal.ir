'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users } from 'lucide-react';

import { DirectoryBusinessCardItem } from '@/components/businesscard/DirectoryBusinessCardItem';
import { DirectoryBusinessCardDetail } from '@/components/businesscard/DirectoryBusinessCardDetail';
import { DirectoryBusinessCardTile } from '@/components/businesscard/DirectoryBusinessCardTile';
import { DirectoryBusinessCardNotebook } from '@/components/businesscard/DirectoryBusinessCardNotebook';
import { MobileSheet } from '@/components/ui/MobileSheet';
import { DirectoryViewSwitch } from '@/components/ui/DirectoryViewSwitch';
import {
  DirectoryBusinessCardFilters,
  type DirectoryFilterState,
} from '@/components/businesscard/DirectoryBusinessCardFilters';
import { type DirectoryBusinessCard } from '@/lib/api';
import {
  useDirectoryResults,
  useInfiniteScroll,
} from '@/lib/directory';
import { primeDirectoryDetails } from '@/lib/directory-detail';
import { useDirectoryView } from '@/lib/directory-view';
import type { DirectoryView } from '@/lib/directory-view';
import type { ServerDirectoryResult } from '@/lib/directory-server';

export function DirectoryBusinessCardContent({
  initialData,
}: {
  initialData: ServerDirectoryResult<
    DirectoryBusinessCard,
    { cities: { id: string; name: string }[]; businesses: { id: string; name: string }[] }
  > | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initial: DirectoryFilterState = {
    q: searchParams.get('q') ?? '',
    cityId: searchParams.get('cityId') ?? '',
    businessId: searchParams.get('businessId') ?? '',
    sort: (searchParams.get('sort') as 'recent' | 'liked' | 'alpha') ?? 'recent',
  };
  const [filters, setFilters] = useState<DirectoryFilterState>(initial);
  // A `?view=` deep-link (e.g. the «دفترچه تلفن» link) wins over the stored
  // preference so shared links open in the intended look.
  const requestedView = searchParams.get('view') as DirectoryView | null;
  const { view, setView } = useDirectoryView(
    requestedView === 'list' || requestedView === 'tiles' || requestedView === 'notebook'
      ? requestedView
      : null,
  );
  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    searchParams.get('card'),
  );

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.cityId) params.set('cityId', filters.cityId);
    if (filters.businessId) params.set('businessId', filters.businessId);
    if (filters.sort !== 'recent') params.set('sort', filters.sort);
    return params.toString();
  }, [filters.q, filters.cityId, filters.businessId, filters.sort]);

  const {
    items,
    meta,
    filters: facets,
    loading,
    error,
    loadMore,
  } = useDirectoryResults<DirectoryBusinessCard>({
    path: '/business-cards/public',
    query: queryString,
    mode: 'INFINITE',
    initialData,
  });

  const sentinelRef = useInfiniteScroll(true, loading, loadMore);

  // Warm the detail panel for every row that just loaded: one batched request
  // per page, so clicking a card shows its details instantly instead of
  // starting a fresh fetch (the page already knows these slugs).
  //
  // Debounced because the SSR-rendered rows are immediately replaced by the
  // client reconcile fetch; priming only the settled set avoids fetching a
  // batch of details for rows that are about to disappear. A click that lands
  // inside the debounce window still resolves fast via the single-slug
  // fallback in `useDirectoryDetail`.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      primeDirectoryDetails(
        'business-cards',
        items.map((businessCard) => businessCard.slug),
      );
    }, 250);
    return () => window.clearTimeout(timer);
  }, [items]);

  // keep the browser URL in sync (shareable results + selected card)
  useEffect(() => {
    const params = new URLSearchParams(queryString);
    params.delete('limit');
    if (selectedSlug) params.set('card', selectedSlug);
    // Keep a deep-linked non-default view in the URL so the page stays
    // shareable in the «دفترچه» / «کاشی» look (the default list omits it).
    if (view !== 'list') params.set('view', view);
    const next = params.toString();
    router.replace(next ? `/business-cards?${next}` : '/business-cards', { scroll: false });
  }, [queryString, selectedSlug, view, router]);

  function reset() {
    setFilters({ q: '', cityId: '', businessId: '', sort: 'recent' });
  }

  return (
    <main className="container-page py-6 directory-shell">
      <div className="mb-5 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Users className="size-7 text-brand" aria-hidden />
          <div>
            <h1 className="text-xl font-extrabold text-ink">دایرکتوری کارت‌های ویزیت</h1>
            <p className="text-sm text-muted">
              {meta
                ? `${meta.total.toLocaleString('fa-IR')} کارت ویزیت منتشرشده — نمایش ${items.length.toLocaleString('fa-IR')} مورد`
                : 'در حال بارگذاری...'}
            </p>
          </div>
        </div>
        <DirectoryViewSwitch value={view} onChange={setView} />
      </div>

      <div className="shrink-0">
        <DirectoryBusinessCardFilters
          value={filters}
          cities={facets.cities}
          businesses={facets.businesses}
          onChange={setFilters}
          onReset={reset}
        />
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : null}

      {view === 'tiles' ? (
        /* «کاشی» view: every published card rendered in its owner's theme, tiled
           next to each other. The switch above returns to the classic list. */
        <div className="directory-tiles mt-5">
          {loading && items.length === 0 ? (
            <div className="directory-tiles-grid">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="indeed-panel h-64 animate-pulse bg-soft" />
              ))}
            </div>
          ) : items.length > 0 ? (
            <>
              <div className="directory-tiles-grid">
                {items.map((businessCard) => (
                  <DirectoryBusinessCardTile
                    key={businessCard.id}
                    businessCard={businessCard}
                  />
                ))}
              </div>
              <div ref={sentinelRef} className="h-2" aria-hidden />
              {loading ? (
                <div className="py-3 text-center text-xs text-muted">
                  در حال بارگذاری موارد بیشتر...
                </div>
              ) : null}
              {!loading && meta && !meta.hasNext ? (
                <div className="py-3 text-center text-xs text-muted">
                  همه نتایج نمایش داده شد.
                </div>
              ) : null}
            </>
          ) : (
            <div className="indeed-panel p-10 text-center">
              <p className="text-lg font-bold text-ink">کارت ویزیتی پیدا نشد</p>
              <p className="mt-2 text-sm text-muted">
                عبارت جستجو یا فیلترها را تغییر دهید.
              </p>
              <button onClick={reset} className="indeed-btn indeed-btn-primary mt-6">
                پاک‌کردن فیلترها
              </button>
            </div>
          )}
        </div>
      ) : view === 'notebook' ? (
        /* «دفترچه تلفن» view: the same published cards as a ruled contact book,
           with the initial of each name (never a logo) and both numbers. */
        items.length === 0 && !loading ? (
          <div className="indeed-panel mt-5 p-10 text-center">
            <p className="text-lg font-bold text-ink">کارت ویزیتی پیدا نشد</p>
            <p className="mt-2 text-sm text-muted">
              عبارت جستجو یا فیلترها را تغییر دهید.
            </p>
            <button onClick={reset} className="indeed-btn indeed-btn-primary mt-6">
              پاک‌کردن فیلترها
            </button>
          </div>
        ) : (
          <DirectoryBusinessCardNotebook
            items={items}
            loading={loading}
            query={filters.q}
            sentinelRef={sentinelRef}
            hasNext={Boolean(meta?.hasNext)}
            grouped={filters.sort === 'alpha'}
          />
        )
      ) : (
      /* Indeed-like split view: list on the right, details on the left.
          From tablet up it is split (like desktop) but with a narrower detail
          column so the list keeps enough room; phones show the list only and
          open the detail in a bottom sheet. */
      <div className="directory-grid mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(320px,44%)] lg:grid-cols-[1fr_420px]">
        <section className="order-2 flex min-h-0 flex-col md:order-1">
          <div className="directory-list min-h-0 flex-1">
            {loading && items.length === 0 ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="indeed-panel h-20 animate-pulse bg-soft" />
                ))}
              </div>
            ) : items.length > 0 ? (
              <>
                <div className="space-y-3">
                  {items.map((businessCard) => (
                    <DirectoryBusinessCardItem
                      key={businessCard.id}
                      businessCard={businessCard}
                      selected={businessCard.slug === selectedSlug}
                      onSelect={() => setSelectedSlug(businessCard.slug)}
                    />
                  ))}
                </div>
                <div ref={sentinelRef} className="h-2" aria-hidden />
                {loading ? (
                  <div className="py-3 text-center text-xs text-muted">
                    در حال بارگذاری موارد بیشتر...
                  </div>
                ) : null}
                {!loading && meta && !meta.hasNext ? (
                  <div className="py-3 text-center text-xs text-muted">
                    همه نتایج نمایش داده شد.
                  </div>
                ) : null}
              </>
            ) : (
              <div className="indeed-panel p-10 text-center">
                <p className="text-lg font-bold text-ink">کارت ویزیتی پیدا نشد</p>
                <p className="mt-2 text-sm text-muted">
                  عبارت جستجو یا فیلترها را تغییر دهید.
                </p>
                <button onClick={reset} className="indeed-btn indeed-btn-primary mt-6">
                  پاک‌کردن فیلترها
                </button>
              </div>
            )}
          </div>

        </section>

        <aside className="directory-aside order-1 hidden min-h-0 md:order-2 md:block">
          <div className="directory-sticky md:sticky md:top-20">
            {selectedSlug ? (
              <div className="indeed-panel h-[calc(100vh-6rem)] overflow-hidden">
                <DirectoryBusinessCardDetail
                  slug={selectedSlug}
                  onClose={() => setSelectedSlug(null)}
                />
              </div>
            ) : (
              <div className="indeed-panel flex h-64 flex-col items-center justify-center p-8 text-center">
                <Users className="size-10 text-brand-light" aria-hidden />
                <p className="mt-3 font-bold text-ink">یک کارت ویزیت را انتخاب کنید</p>
                <p className="mt-1 text-sm text-muted">
                  برای دیدن جزئیات و راه‌های تماس، روی هر کارت ویزیت در فهرست کلیک کنید.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
      )}

      {/* Mobile: details open as a bottom-sheet modal instead of the side panel */}
      <MobileSheet
        open={Boolean(selectedSlug)}
        onClose={() => setSelectedSlug(null)}
        title="جزئیات کارت ویزیت"
      >
        {selectedSlug ? (
          <DirectoryBusinessCardDetail
            slug={selectedSlug}
            onClose={() => setSelectedSlug(null)}
            hideHeader
          />
        ) : null}
      </MobileSheet>
    </main>
  );
}
