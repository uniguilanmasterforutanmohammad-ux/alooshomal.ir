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

      <div className="indeed-panel mt-5 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-dashed divide-[var(--vintage-border)]">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse bg-soft" />
            ))}
          </div>
        ) : items.length > 0 ? (
          <table className="dash-table w-full text-right">
            <thead>
              <tr className="border-b border-dashed border-[var(--vintage-border)] text-xs text-muted">
                <th className="px-4 py-3 font-bold">تیتر خبر</th>
                <th className="hidden px-4 py-3 font-bold md:table-cell">دسته‌بندی</th>
                <th className="hidden px-4 py-3 font-bold lg:table-cell">منتشرکننده</th>
                <th className="hidden px-4 py-3 font-bold sm:table-cell">تاریخ</th>
                <th className="px-4 py-3 font-bold">مشاهده</th>
              </tr>
            </thead>
            <tbody>
              {items.map((news) => (
                <tr
                  key={news.id}
                  className="border-b border-dashed border-[var(--vintage-border)] transition last:border-b-0 hover:bg-[color-mix(in_srgb,var(--vintage-accent)_6%,transparent)]"
                >
                  {/* Title + one-line summary (the headline column). */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/pulse/${news.id}`}
                      className="text-sm font-bold text-ink hover:text-brand hover:underline"
                    >
                      {news.title}
                    </Link>
                    {news.summary ? (
                      <p className="mt-1 line-clamp-1 text-xs text-muted">{news.summary}</p>
                    ) : null}
                  </td>

                  <td className="hidden px-4 py-3 md:table-cell" data-label="دسته‌بندی">
                    <span className="badge-open rounded-md border px-2 py-0.5 text-[11px] font-bold">
                      {news.category?.name ?? 'خبر'}
                    </span>
                  </td>

                  <td
                    className="hidden px-4 py-3 text-xs text-muted lg:table-cell"
                    data-label="منتشرکننده"
                  >
                    <span className="inline-flex items-center gap-1">
                      <UserRound className="size-3.5" aria-hidden />
                      {news.publisherName ?? news.author?.fullName ?? 'شهروند خبرنگار'}
                    </span>
                  </td>

                  <td
                    className="hidden whitespace-nowrap px-4 py-3 text-xs text-muted sm:table-cell"
                    data-label="تاریخ"
                  >
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3.5" aria-hidden />
                      {faDate(news.publishedAt ?? news.createdAt)}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <Link
                      href={`/pulse/${news.id}`}
                      className="indeed-btn indeed-btn-secondary px-3 py-1 text-xs"
                      aria-label={`مشاهده کامل خبر ${news.title}`}
                    >
                      مشاهده
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-10 text-center">
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
