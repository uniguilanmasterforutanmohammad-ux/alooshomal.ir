'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  Hash,
  Newspaper,
  Search,
  Share2,
  TrendingUp,
  X,
} from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { StoppedSectionScreen } from '@/components/layout/StoppedSectionScreen';
import { TwitterSearch } from '@/components/layout/TwitterSearch';
import { TwitterShell } from '@/components/layout/TwitterShell';
import { ReporterCtaButton } from '@/components/news/ReporterCtaButton';
import { api, type NewsCategory, type NewsItem, type NewsListResponse } from '@/lib/api';
import { useFeatures } from '@/lib/features';
import { faDateTime, faRelativeTime } from '@/lib/time';
import { toast } from '@/lib/toast';
import { accentColor } from '@/lib/utils';

interface PulseFilterState {
  q: string;
  categoryId: string;
}

/** One news item as a Twitter-style timeline row. */
function NewsRow({ news }: { news: NewsItem }) {
  const href = `/pulse/${news.id}`;
  const accent = accentColor(news.category?.id ?? news.id);

  async function share() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${href}`);
      toast.success('لینک خبر کپی شد');
    } catch {
      toast.error('کپی لینک ممکن نشد');
    }
  }

  return (
    <article className="tw-post">
      <Link href={href} className="shrink-0" aria-label={`خبر ${news.title}`}>
        <span className="tw-avatar" style={{ background: accent }} aria-hidden>
          <Newspaper className="size-5" />
        </span>
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-extrabold text-ink">
            {news.publisherName ?? news.author?.fullName ?? 'شهروند خبرنگار'}
          </span>
          <span className="text-xs text-muted" aria-hidden>
            ·
          </span>
          <Link
            href={href}
            className="shrink-0 text-xs text-muted hover:underline"
            title={faDateTime(news.publishedAt ?? news.createdAt)}
          >
            {faRelativeTime(news.publishedAt ?? news.createdAt)}
          </Link>
          <Globe className="size-3 shrink-0 text-muted" aria-hidden />
          {news.category ? (
            <span className="ms-auto shrink-0 rounded-full bg-brand-light px-2.5 py-0.5 text-[11px] font-bold text-brand">
              {news.category.name}
            </span>
          ) : null}
        </div>

        <Link href={href} className="mt-1 block">
          <h3 className="text-base font-extrabold leading-7 text-ink hover:underline sm:text-lg">
            {news.title}
          </h3>
        </Link>
        {news.summary ? (
          <p className="mt-1 line-clamp-3 text-sm leading-7 text-muted">{news.summary}</p>
        ) : null}

        <div className="tw-actions tw-actions-start">
          <Link href={href} className="tw-action font-bold" aria-label="مشاهده کامل خبر">
            <Newspaper className="size-[18px]" aria-hidden />
            مشاهده خبر
          </Link>
          <button
            type="button"
            onClick={share}
            className="tw-action"
            aria-label="کپی لینک خبر"
          >
            <Share2 className="size-[18px]" aria-hidden />
          </button>
        </div>
      </div>
    </article>
  );
}

function PulseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSectionStopped } = useFeatures();

  const [filters, setFilters] = useState<PulseFilterState>({
    q: searchParams.get('q') ?? '',
    categoryId: searchParams.get('categoryId') ?? '',
  });
  const [page, setPage] = useState(Number(searchParams.get('page') ?? 1));
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [data, setData] = useState<NewsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

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

  const setQuery = (q: string) => setFilters((prev) => ({ ...prev, q }));
  const setCategory = (categoryId: string) =>
    setFilters((prev) => ({ ...prev, categoryId }));

  const meta = data?.meta;
  const items = data?.items ?? [];

  if (isSectionStopped('/pulse')) {
    return (
      <>
        <Header />
        <StoppedSectionScreen title="اخبار شهر" />
      </>
    );
  }

  return (
    <TwitterShell
      sidebarLabel="جستجو و دسته‌بندی اخبار"
      action={
        <ReporterCtaButton
          variant="primary"
          className="mt-4 w-full justify-center rounded-full py-3 text-sm"
        />
      }
      sidebar={
        <>
          <TwitterSearch
            value={filters.q}
            onSubmit={setQuery}
            placeholder="جستجو در اخبار"
          />

          <section className="tw-card mt-4" aria-labelledby="pulse-cats-title">
            <h2
              id="pulse-cats-title"
              className="flex items-center gap-2 px-4 pb-1 pt-3 text-lg font-extrabold text-ink"
            >
              <TrendingUp className="size-5 text-brand" aria-hidden />
              دسته‌بندی‌ها
            </h2>
            {categories.length ? (
              categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategory(category.id)}
                  className="tw-trend"
                  data-active={filters.categoryId === category.id}
                >
                  <span className="text-[11px] text-muted">دسته خبر</span>
                  <span className="inline-flex items-center gap-1 text-sm font-extrabold text-ink">
                    <Hash className="size-3.5 text-brand" aria-hidden />
                    {category.name}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-4 py-3 text-xs text-muted">دسته‌بندی‌ای ثبت نشده است.</p>
            )}
            <button type="button" onClick={() => setCategory('')} className="tw-card-more">
              همهٔ اخبار
            </button>
          </section>

          <section className="tw-card p-4" aria-labelledby="pulse-cta-title">
            <h2 id="pulse-cta-title" className="text-lg font-extrabold text-ink">
              شهروند خبرنگار شوید
            </h2>
            <p className="mt-1 text-xs leading-6 text-muted">
              خبر محله، رویداد یا سوژه‌ای دیدی؟ آن را برای ما بفرست تا پس از بررسی
              مدیر در «اخبار شهر» منتشر شود.
            </p>
            <ReporterCtaButton
              variant="primary"
              className="mt-3 w-full justify-center rounded-full py-2.5 text-sm"
            />
          </section>

          <nav className="flex flex-wrap gap-x-3 gap-y-1 px-2 text-[11px] text-muted">
            <Link href="/guide" className="hover:text-brand">
              راهنما
            </Link>
            <Link href="/rules" className="hover:text-brand">
              قوانین
            </Link>
            <Link href="/dashboard/tickets" className="hover:text-brand">
              پشتیبانی
            </Link>
            <Link href="/" className="hover:text-brand">
              خانه
            </Link>
          </nav>
        </>
      }
    >
      {/* Sticky timeline header: title, mobile search toggle and category chips. */}
      <header className="tw-header">
        <div className="tw-header-row">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-extrabold text-ink">اخبار شهر</h1>
            <p className="truncate text-[11px] text-muted">
              {meta
                ? `${meta.total.toLocaleString('fa-IR')} خبر منتشرشده`
                : 'در حال بارگذاری...'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSearchOpen((open) => !open)}
            className="tw-icon-btn lg:hidden"
            aria-label={searchOpen ? 'بستن جستجو' : 'جستجو'}
            aria-expanded={searchOpen}
          >
            {searchOpen ? (
              <X className="size-5" aria-hidden />
            ) : (
              <Search className="size-5" aria-hidden />
            )}
          </button>
          <ReporterCtaButton
            variant="secondary"
            className="hidden rounded-full py-2 text-sm sm:inline-flex"
          />
        </div>

        {searchOpen ? (
          <div className="px-4 pb-3 lg:hidden">
            <TwitterSearch
              value={filters.q}
              onSubmit={setQuery}
              placeholder="جستجو در اخبار"
              autoFocus
            />
          </div>
        ) : null}

        <div className="tw-topic-row" role="group" aria-label="فیلتر دسته‌بندی">
          <button
            type="button"
            aria-pressed={!filters.categoryId}
            data-active={!filters.categoryId}
            className="tw-topic-chip"
            onClick={() => setCategory('')}
          >
            برای شما
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={filters.categoryId === category.id}
              data-active={filters.categoryId === category.id}
              className="tw-topic-chip"
              onClick={() => setCategory(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
      </header>

      {error ? (
        <p className="m-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div>
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="tw-post">
              <div className="tw-avatar animate-pulse bg-soft" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 w-1/3 animate-pulse rounded-full bg-soft" />
                <div className="h-4 w-full animate-pulse rounded-full bg-soft" />
                <div className="h-3 w-2/3 animate-pulse rounded-full bg-soft" />
              </div>
            </div>
          ))
        ) : items.length > 0 ? (
          items.map((news) => <NewsRow key={news.id} news={news} />)
        ) : (
          <div className="px-6 py-16 text-center">
            <p className="text-lg font-bold text-ink">خبری پیدا نشد</p>
            <p className="mt-2 text-sm text-muted">عبارت جستجو یا فیلترها را تغییر دهید.</p>
            <button onClick={reset} className="indeed-btn indeed-btn-primary mt-6 rounded-full">
              پاک‌کردن فیلترها
            </button>
          </div>
        )}
      </div>

      {meta && meta.totalPages > 1 ? (
        <div className="tw-more">
          <button
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={!meta.hasPrev}
            className="indeed-btn indeed-btn-secondary rounded-full px-5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="size-4" aria-hidden />
            قبلی
          </button>
          <span className="text-xs text-muted">
            صفحه {meta.page.toLocaleString('fa-IR')} از {meta.totalPages.toLocaleString('fa-IR')}
          </span>
          <button
            onClick={() => setPage((current) => current + 1)}
            disabled={!meta.hasNext}
            className="indeed-btn indeed-btn-secondary rounded-full px-5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            بعدی
            <ChevronLeft className="size-4" aria-hidden />
          </button>
        </div>
      ) : null}
    </TwitterShell>
  );
}

export default function PulsePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-muted">
          در حال بارگذاری...
        </div>
      }
    >
      <PulseContent />
    </Suspense>
  );
}
