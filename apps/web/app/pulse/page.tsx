'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CalendarDays, ChevronLeft, ChevronRight, Newspaper, UserRound } from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PulseFilters, type PulseFilterState } from '@/components/news/PulseFilters';
import { ReporterCtaButton } from '@/components/news/ReporterCtaButton';
import { api, type NewsCategory, type NewsListResponse } from '@/lib/api';

function faDate(value: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('fa-IR');
}

function PulseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<PulseFilterState>({
    q: searchParams.get('q') ?? '',
    categoryId: searchParams.get('categoryId') ?? '',
  });
  const [page, setPage] = useState(Number(searchParams.get('page') ?? 1));
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [data, setData] = useState<NewsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<NewsCategory[]>('/news/public/categories')
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filters.q, filters.categoryId]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (page > 1) params.set('page', String(page));
    return params.toString();
  }, [filters.q, filters.categoryId, page]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<NewsListResponse>(`/news/public?${queryString}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری خبرها');
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(queryString);
    const next = params.toString();
    router.replace(next ? `/pulse?${next}` : '/pulse', { scroll: false });
  }, [queryString, router]);

  function reset() {
    setFilters({ q: '', categoryId: '' });
    setPage(1);
  }

  const meta = data?.meta;
  const items = data?.items ?? [];

  return (
    <main className="container-page py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="vintage-avatar flex size-11 items-center justify-center">
            <Newspaper className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-ink">اخبار شهر</h1>
            <p className="text-sm text-muted">
              {meta
                ? `${meta.total.toLocaleString('fa-IR')} خبر منتشرشده`
                : 'در حال بارگذاری...'}
            </p>
          </div>
        </div>
        <ReporterCtaButton variant="secondary" className="py-2 text-sm" />
      </div>

      <PulseFilters
        value={filters}
        categories={categories}
        onChange={setFilters}
        onReset={reset}
      />

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="mt-5 space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="indeed-panel h-24 animate-pulse bg-soft" />
          ))
        ) : items.length > 0 ? (
          items.map((news) => (
            <article key={news.id} className="indeed-panel p-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="badge-open rounded-md border px-2 py-0.5 text-[11px] font-bold">
                  {news.category?.name ?? 'خبر'}
                </span>
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <UserRound className="size-3.5" aria-hidden />
                    {news.publisherName ?? news.author?.fullName ?? 'شهروند خبرنگار'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3.5" aria-hidden />
                    {faDate(news.publishedAt ?? news.createdAt)}
                  </span>
                </div>
              </div>
              <h2 className="mt-2 text-lg font-extrabold text-ink">{news.title}</h2>
              {news.summary ? (
                <p className="mt-2 text-sm leading-7 text-muted">{news.summary}</p>
              ) : null}
              <div className="mt-3">
                <Link
                  href={`/pulse/${news.id}`}
                  className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
                >
                  مشاهده کامل خبر
                </Link>
              </div>
            </article>
          ))
        ) : (
          <div className="indeed-panel p-10 text-center">
            <p className="text-lg font-bold text-ink">خبری پیدا نشد</p>
            <p className="mt-2 text-sm text-muted">عبارت جستجو یا فیلترها را تغییر دهید.</p>
            <button onClick={reset} className="indeed-btn indeed-btn-primary mt-6">
              پاک‌کردن فیلترها
            </button>
          </div>
        )}
      </div>

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
            صفحه {meta.page.toLocaleString('fa-IR')} از {meta.totalPages.toLocaleString('fa-IR')}
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
    </main>
  );
}

export default function PulsePage() {
  return (
    <>
      <Header />
      <Suspense
        fallback={<div className="container-page py-8 text-muted">در حال بارگذاری...</div>}
      >
        <PulseContent />
      </Suspense>
      <Footer />
    </>
  );
}
