'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { DirectoryBusinessCardItem } from '@/components/businesscard/DirectoryBusinessCardItem';
import { DirectoryBusinessCardDetail } from '@/components/businesscard/DirectoryBusinessCardDetail';
import { MobileSheet } from '@/components/ui/MobileSheet';
import {
  DirectoryBusinessCardFilters,
  type DirectoryFilterState,
} from '@/components/businesscard/DirectoryBusinessCardFilters';
import { type DirectoryBusinessCard } from '@/lib/api';
import {
  useDirectoryDisplayMode,
  useDirectoryResults,
  useInfiniteScroll,
} from '@/lib/directory';

function DirectoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initial: DirectoryFilterState = {
    q: searchParams.get('q') ?? '',
    cityId: searchParams.get('cityId') ?? '',
    businessId: searchParams.get('businessId') ?? '',
    sort: (searchParams.get('sort') as 'recent' | 'liked') ?? 'recent',
  };
  const [filters, setFilters] = useState<DirectoryFilterState>(initial);
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

  const displayMode = useDirectoryDisplayMode();
  const {
    items,
    meta,
    filters: facets,
    loading,
    error,
    page,
    setPage,
    loadMore,
  } = useDirectoryResults<DirectoryBusinessCard>({
    path: '/business-cards/public',
    query: queryString,
    mode: displayMode,
    initialPage: Number(searchParams.get('page') ?? 1) || 1,
  });

  const sentinelRef = useInfiniteScroll(
    displayMode === 'INFINITE',
    loading,
    loadMore,
  );

  // keep the browser URL in sync (shareable results + selected card)
  useEffect(() => {
    const params = new URLSearchParams(queryString);
    params.delete('limit');
    if (page > 1) params.set('page', String(page));
    if (selectedSlug) params.set('card', selectedSlug);
    const next = params.toString();
    router.replace(next ? `/business-cards?${next}` : '/business-cards', { scroll: false });
  }, [queryString, page, selectedSlug, router]);

  function reset() {
    setFilters({ q: '', cityId: '', businessId: '', sort: 'recent' });
    setPage(1);
  }

  return (
    <main className="container-page py-6 directory-shell">
      <div className="mb-5 flex shrink-0 items-center gap-3">
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

      {/* Indeed-like split view: list on the right, details on the left.
          From tablet up it is split (like desktop) but with a narrower detail
          column so the list keeps enough room; phones show the list only and
          open the detail in a bottom sheet. */}
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
                {displayMode === 'INFINITE' ? (
                  <div ref={sentinelRef} className="h-2" aria-hidden />
                ) : null}
                {displayMode === 'INFINITE' && loading ? (
                  <div className="py-3 text-center text-xs text-muted">
                    در حال بارگذاری موارد بیشتر...
                  </div>
                ) : null}
                {displayMode === 'INFINITE' && !loading && meta && !meta.hasNext ? (
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

          {displayMode === 'PAGINATION' && meta && meta.totalPages > 1 ? (
            <div className="mt-4 flex shrink-0 items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={!meta.hasPrev}
                className="indeed-btn indeed-btn-secondary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="size-4" aria-hidden />
                قبلی
              </button>
              <span className="text-sm text-muted">
                صفحه {meta.page.toLocaleString('fa-IR')} از{' '}
                {meta.totalPages.toLocaleString('fa-IR')}
              </span>
              <button
                onClick={() => setPage((current) => current + 1)}
                disabled={!meta.hasNext}
                className="indeed-btn indeed-btn-secondary disabled:cursor-not-allowed disabled:opacity-40"
              >
                بعدی
                <ChevronLeft className="size-4" aria-hidden />
              </button>
            </div>
          ) : null}
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

export default function DirectoryPage() {
  return (
    <>
      <Header />
      <Suspense
        fallback={<div className="container-page py-8 text-muted">در حال بارگذاری...</div>}
      >
        <DirectoryContent />
      </Suspense>
      {/* Mobile/tablet hide the footer so only the card list scrolls. */}
      <div className="hidden lg:block">
        <Footer />
      </div>
    </>
  );
}
