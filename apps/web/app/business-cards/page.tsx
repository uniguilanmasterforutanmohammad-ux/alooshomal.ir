'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
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
import { api, type DirectoryBusinessCardResponse } from '@/lib/api';

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
  const [page, setPage] = useState(Number(searchParams.get('page') ?? 1));
  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    searchParams.get('card'),
  );

  const [data, setData] = useState<DirectoryBusinessCardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [filters.q, filters.cityId, filters.businessId, filters.sort]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.cityId) params.set('cityId', filters.cityId);
    if (filters.businessId) params.set('businessId', filters.businessId);
    if (filters.sort !== 'recent') params.set('sort', filters.sort);
    if (page > 1) params.set('page', String(page));
    return params.toString();
  }, [filters.q, filters.cityId, filters.businessId, filters.sort, page]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<DirectoryBusinessCardResponse>(`/business-cards/public?${queryString}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری کارت‌های ویزیت');
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void load();
  }, [load]);

  // keep the browser URL in sync (shareable results + selected card)
  useEffect(() => {
    const params = new URLSearchParams(queryString);
    params.delete('limit');
    if (selectedSlug) params.set('card', selectedSlug);
    const next = params.toString();
    router.replace(next ? `/business-cards?${next}` : '/business-cards', { scroll: false });
  }, [queryString, selectedSlug, router]);

  function reset() {
    setFilters({ q: '', cityId: '', businessId: '', sort: 'recent' });
    setPage(1);
  }

  const meta = data?.meta;
  const items = data?.items ?? [];

  return (
    <main className="container-page py-6">
      <div className="mb-5 flex items-center gap-3">
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

      <DirectoryBusinessCardFilters
        value={filters}
        cities={data?.filters.cities ?? []}
        businesses={data?.filters.businesses ?? []}
        onChange={setFilters}
        onReset={reset}
      />

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : null}

      {/* Indeed-like split view: list on the right, details on the left */}
      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_420px]">
        <section className="order-2 lg:order-1">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="indeed-panel h-20 animate-pulse bg-soft" />
              ))}
            </div>
          ) : items.length > 0 ? (
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

          {meta && meta.totalPages > 1 ? (
            <div className="mt-6 flex items-center justify-center gap-3">
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

        <aside className="order-1 hidden lg:order-2 lg:block">
          <div className="lg:sticky lg:top-20">
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
      <Footer />
    </>
  );
}
