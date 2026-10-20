'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users } from 'lucide-react';

import { DirectoryBiolinkItem } from '@/components/biolink/DirectoryBiolinkItem';
import { DirectoryBiolinkDetail } from '@/components/biolink/DirectoryBiolinkDetail';
import { DirectoryBiolinkTile } from '@/components/biolink/DirectoryBiolinkTile';
import { MobileSheet } from '@/components/ui/MobileSheet';
import { DirectoryViewSwitch } from '@/components/ui/DirectoryViewSwitch';
import {
  DirectoryBiolinkFilters,
  type DirectoryFilterState,
} from '@/components/biolink/DirectoryBiolinkFilters';
import { type DirectoryBiolink } from '@/lib/api';
import {
  useDirectoryResults,
  useInfiniteScroll,
} from '@/lib/directory';
import { primeDirectoryDetails } from '@/lib/directory-detail';
import { useDirectoryView } from '@/lib/directory-view';
import type { ServerDirectoryResult } from '@/lib/directory-server';

export function DirectoryBiolinkContent({
  initialData,
}: {
  initialData: ServerDirectoryResult<
    DirectoryBiolink,
    { cities: { id: string; name: string }[]; businesses: { id: string; name: string }[] }
  > | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initial: DirectoryFilterState = {
    q: searchParams.get('q') ?? '',
    cityId: searchParams.get('cityId') ?? '',
    businessId: searchParams.get('businessId') ?? '',
    sort: (searchParams.get('sort') as 'recent' | 'liked') ?? 'recent',
  };
  const [filters, setFilters] = useState<DirectoryFilterState>(initial);
  const { view, setView } = useDirectoryView();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    searchParams.get('biolink'),
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
  } = useDirectoryResults<DirectoryBiolink>({
    path: '/biolinks/public',
    query: queryString,
    mode: 'INFINITE',
    initialData,
  });

  const sentinelRef = useInfiniteScroll(true, loading, loadMore);

  // Warm the detail panel for every row that just loaded: one batched request
  // per page, so clicking a biolink shows its details instantly instead of
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
        'biolinks',
        items.map((biolink) => biolink.slug),
      );
    }, 250);
    return () => window.clearTimeout(timer);
  }, [items]);

  // keep the browser URL in sync (shareable results + selected biolink)
  useEffect(() => {
    const params = new URLSearchParams(queryString);
    params.delete('limit');
    if (selectedSlug) params.set('biolink', selectedSlug);
    const next = params.toString();
    router.replace(next ? `/biolinks?${next}` : '/biolinks', { scroll: false });
  }, [queryString, selectedSlug, router]);

  function reset() {
    setFilters({ q: '', cityId: '', businessId: '', sort: 'recent' });
  }

  return (
    <main className="container-page py-6 directory-shell">
      <div className="mb-5 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Users className="size-7 text-brand" aria-hidden />
          <div>
            <h1 className="text-xl font-extrabold text-ink">دایرکتوری بیولینک‌ها</h1>
            <p className="text-sm text-muted">
              {meta
                ? `${meta.total.toLocaleString('fa-IR')} بیولینک منتشرشده — نمایش ${items.length.toLocaleString('fa-IR')} مورد`
                : 'در حال بارگذاری...'}
            </p>
          </div>
        </div>
        <DirectoryViewSwitch value={view} onChange={setView} />
      </div>

      <div className="shrink-0">
        <DirectoryBiolinkFilters
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

      {/* Indeed-like split view: list on the right, details on the left.
          From tablet up it is split (like desktop) but with a narrower detail
          column so the list keeps enough room; phones show the list only and
          open the detail in a bottom sheet. */}
      {view === 'tiles' ? (
        /* «کاشی» view: every published biolink rendered in its owner's theme,
           tiled next to each other. The switch above returns to the list. */
        <div className="directory-tiles mt-5">
          {loading && items.length === 0 ? (
            <div className="directory-tiles-grid">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="indeed-panel h-72 animate-pulse bg-soft" />
              ))}
            </div>
          ) : items.length > 0 ? (
            <>
              <div className="directory-tiles-grid">
                {items.map((biolink) => (
                  <DirectoryBiolinkTile
                    key={biolink.id}
                    biolink={biolink}
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
              <p className="text-lg font-bold text-ink">بیولینکی پیدا نشد</p>
              <p className="mt-2 text-sm text-muted">
                عبارت جستجو یا فیلترها را تغییر دهید.
              </p>
              <button onClick={reset} className="indeed-btn indeed-btn-primary mt-6">
                پاک‌کردن فیلترها
              </button>
            </div>
          )}
        </div>
      ) : (
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
                  {items.map((biolink) => (
                    <DirectoryBiolinkItem
                      key={biolink.id}
                      biolink={biolink}
                      selected={biolink.slug === selectedSlug}
                      onSelect={() => setSelectedSlug(biolink.slug)}
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
                <p className="text-lg font-bold text-ink">بیولینکی پیدا نشد</p>
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
                <DirectoryBiolinkDetail
                  slug={selectedSlug}
                  onClose={() => setSelectedSlug(null)}
                />
              </div>
            ) : (
              <div className="indeed-panel flex h-64 flex-col items-center justify-center p-8 text-center">
                <Users className="size-10 text-brand-light" aria-hidden />
                <p className="mt-3 font-bold text-ink">یک بیولینک را انتخاب کنید</p>
                <p className="mt-1 text-sm text-muted">
                  برای دیدن جزئیات و راه‌های تماس، روی هر بیولینک در فهرست کلیک کنید.
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
        title="جزئیات بیولینک"
      >
        {selectedSlug ? (
          <DirectoryBiolinkDetail
            slug={selectedSlug}
            onClose={() => setSelectedSlug(null)}
            hideHeader
          />
        ) : null}
      </MobileSheet>
    </main>
  );
}
