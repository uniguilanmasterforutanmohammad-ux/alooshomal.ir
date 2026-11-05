'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Clock,
  Eye,
  Globe,
  Hash,
  Newspaper,
  Play,
  Search,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';

import { Pagination } from '@/components/ui/Pagination';
import { TwitterSearch } from '@/components/layout/TwitterSearch';
import { TwitterShell } from '@/components/layout/TwitterShell';
import { api, type BlogCategory, type BlogListResponse, type BlogPost } from '@/lib/api';
import { blogAccent, blogReadMinutes } from '@/lib/blog';
import { faDateTime, faRelativeTime } from '@/lib/time';

/** Small cover block shared by the pinned and regular rows. */
function Cover({ post }: { post: BlogPost }) {
  const accent = blogAccent(post.id);
  return (
    <Link href={`/blog/${post.slug}`} className="tw-media block" aria-label={post.title}>
      <div className="relative aspect-video overflow-hidden">
        {post.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverImageUrl}
            alt=""
            className="size-full object-cover transition hover:scale-[1.02]"
          />
        ) : (
          <span
            className="flex size-full items-center justify-center"
            style={{ backgroundColor: `${accent}22` }}
          >
            <BookOpen className="size-10" style={{ color: accent }} aria-hidden />
          </span>
        )}
        {post.videoId ? (
          <span className="absolute end-3 top-3 flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-bold text-white">
            <Play className="size-3" aria-hidden />
            ویدیو
          </span>
        ) : null}
      </div>
    </Link>
  );
}

/** Standard article row: text first, then a rounded link card with the cover. */
function PostRow({ post }: { post: BlogPost }) {
  const href = `/blog/${post.slug}`;
  const accent = blogAccent(post.id);
  return (
    <article className="tw-post">
      <Link href={href} className="shrink-0" aria-label={post.title}>
        <span className="tw-avatar" style={{ background: accent }} aria-hidden>
          {post.category ? post.category.name.trim().charAt(0) : <BookOpen className="size-5" />}
        </span>
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-extrabold text-ink">بلاگ شمالی کارت</span>
          <span className="text-xs text-muted" aria-hidden>
            ·
          </span>
          <Link
            href={href}
            className="shrink-0 text-xs text-muted hover:underline"
            title={faDateTime(post.publishedAt ?? post.createdAt)}
          >
            {faRelativeTime(post.publishedAt ?? post.createdAt)}
          </Link>
          <Globe className="size-3 shrink-0 text-muted" aria-hidden />
          {post.category ? (
            <span className="ms-auto shrink-0 rounded-full bg-brand-light px-2.5 py-0.5 text-[11px] font-bold text-brand">
              {post.category.name}
            </span>
          ) : null}
        </div>

        <Link href={href}>
          <h3 className="mt-1 text-base font-extrabold leading-7 text-ink hover:underline">
            {post.title}
          </h3>
        </Link>
        {post.excerpt ? (
          <p className="mt-1 line-clamp-3 text-sm leading-7 text-muted">{post.excerpt}</p>
        ) : null}

        {post.coverImageUrl ? <Cover post={post} /> : null}

        <div className="tw-actions tw-actions-start">
          <Link href={href} className="tw-action font-bold" aria-label="خواندن مطلب">
            <BookOpen className="size-[18px]" aria-hidden />
            خواندن
          </Link>
          <span className="tw-action" title="بازدید">
            <Eye className="size-[18px]" aria-hidden />
            {post.viewCount.toLocaleString('fa-IR')}
          </span>
          <span className="tw-action" title="زمان مطالعه">
            <Clock className="size-[18px]" aria-hidden />
            {blogReadMinutes(post.content).toLocaleString('fa-IR')} دقیقه
          </span>
        </div>
      </div>
    </article>
  );
}

/** The pinned/featured article, given a little more room at the top. */
function FeaturedRow({ post }: { post: BlogPost }) {
  const href = `/blog/${post.slug}`;
  const accent = blogAccent(post.id);
  return (
    <article className="tw-post">
      <Link href={href} className="shrink-0" aria-label={post.title}>
        <span
          className="tw-avatar"
          style={{ background: accent }}
          aria-hidden
        >
          <Sparkles className="size-5" />
        </span>
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-extrabold text-ink">بلاگ شمالی کارت</span>
          <span className="text-xs text-muted" aria-hidden>
            ·
          </span>
          <span className="text-xs text-muted">
            {faRelativeTime(post.publishedAt ?? post.createdAt)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-light px-2.5 py-0.5 text-[11px] font-bold text-brand">
            <Sparkles className="size-3" aria-hidden />
            مطلب شاخص
          </span>
        </div>

        <Link href={href}>
          <h3 className="mt-1 text-lg font-extrabold leading-8 text-ink hover:underline sm:text-xl">
            {post.title}
          </h3>
        </Link>
        {post.excerpt ? (
          <p className="mt-1 line-clamp-3 text-sm leading-7 text-muted">{post.excerpt}</p>
        ) : null}

        <Cover post={post} />

        <div className="tw-actions tw-actions-start">
          <Link
            href={href}
            className="indeed-btn indeed-btn-primary rounded-full px-5 py-2 text-sm"
          >
            خواندن مطلب
          </Link>
          {post.category ? (
            <span className="tw-action">
              <Hash className="size-[18px]" aria-hidden />
              {post.category.name}
            </span>
          ) : null}
          <span className="tw-action" title="زمان مطالعه">
            <Clock className="size-[18px]" aria-hidden />
            {blogReadMinutes(post.content).toLocaleString('fa-IR')} دقیقه
          </span>
        </div>
      </div>
    </article>
  );
}

/**
 * «بلاگ» index in the shared Twitter-style shell: a sticky header with category
 * chips, a timeline of article link-cards (featured one pinned on top), and a
 * sidebar with search, categories and a cross-link to the city news.
 */
export function BlogIndex() {
  const [data, setData] = useState<BlogListResponse | null>(null);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    api
      .get<BlogCategory[]>('/blog/public/categories')
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [q, categoryId]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (categoryId) params.set('categoryId', categoryId);
    if (page > 1) params.set('page', String(page));
    params.set('limit', '9');
    return params.toString();
  }, [q, categoryId, page]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<BlogListResponse>(`/blog/public?${queryString}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری مطالب');
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void load();
  }, [load]);

  const featured = data?.items.find((post) => post.isFeatured) ?? null;
  const rest = (data?.items ?? []).filter((post) => post.id !== featured?.id);

  return (
    <TwitterShell
      sidebarLabel="جستجو و دسته‌بندی مطالب"
      action={
        <Link
          href="/pulse"
          className="indeed-btn indeed-btn-secondary mt-4 w-full justify-center rounded-full py-3 text-sm"
        >
          <Newspaper className="size-5" aria-hidden />
          <span className="tw-rail-label">اخبار شهر</span>
        </Link>
      }
      sidebar={
        <>
          <TwitterSearch
            value={q}
            onSubmit={setQ}
            placeholder="جستجو در مطالب بلاگ"
          />

          <section className="tw-card mt-4" aria-labelledby="blog-cats-title">
            <h2
              id="blog-cats-title"
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
                  onClick={() => setCategoryId(category.id)}
                  className="tw-trend"
                  data-active={categoryId === category.id}
                >
                  <span className="text-[11px] text-muted">دسته مطلب</span>
                  <span className="inline-flex items-center gap-1 text-sm font-extrabold text-ink">
                    <Hash className="size-3.5 text-brand" aria-hidden />
                    {category.name}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-4 py-3 text-xs text-muted">دسته‌بندی‌ای ثبت نشده است.</p>
            )}
            <button type="button" onClick={() => setCategoryId('')} className="tw-card-more">
              همهٔ مطالب
            </button>
          </section>

          <section className="tw-card p-4" aria-labelledby="blog-cta-title">
            <h2 id="blog-cta-title" className="text-lg font-extrabold text-ink">
              از شهر خودت بنویس
            </h2>
            <p className="mt-1 text-xs leading-6 text-muted">
              یادداشت، عکس یا معرفی کسب‌وکارت را در فید کاربران منتشر کن و در
              «اخبار شهر» هم سوژه‌های محله را دنبال کن.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <Link
                href="/feeds"
                className="indeed-btn indeed-btn-primary justify-center rounded-full py-2.5 text-sm"
              >
                پست‌های کاربران
              </Link>
              <Link
                href="/pulse"
                className="indeed-btn indeed-btn-secondary justify-center rounded-full py-2.5 text-sm"
              >
                اخبار شهر
              </Link>
            </div>
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
            <h1 className="truncate text-lg font-extrabold text-ink">بلاگ شمالی کارت</h1>
            <p className="truncate text-[11px] text-muted">
              {data
                ? `${data.meta.total.toLocaleString('fa-IR')} مطلب منتشرشده`
                : 'مقالات، آموزش‌ها و ویدیوهای شهر'}
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
        </div>

        {searchOpen ? (
          <div className="px-4 pb-3 lg:hidden">
            <TwitterSearch
              value={q}
              onSubmit={setQ}
              placeholder="جستجو در مطالب بلاگ"
              autoFocus
            />
          </div>
        ) : null}

        <div className="tw-topic-row" role="group" aria-label="فیلتر دسته‌بندی">
          <button
            type="button"
            aria-pressed={!categoryId}
            data-active={!categoryId}
            className="tw-topic-chip"
            onClick={() => setCategoryId('')}
          >
            برای شما
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={categoryId === category.id}
              data-active={categoryId === category.id}
              className="tw-topic-chip"
              onClick={() => setCategoryId(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
      </header>

      {error ? (
        <p className="m-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

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
      ) : !data || data.items.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="text-lg font-bold text-ink">مطلبی یافت نشد</p>
          <p className="mt-2 text-sm text-muted">عبارت جستجو یا دسته‌بندی را تغییر دهید.</p>
          {q || categoryId ? (
            <button
              onClick={() => {
                setQ('');
                setCategoryId('');
              }}
              className="indeed-btn indeed-btn-primary mt-6 rounded-full"
            >
              پاک‌کردن فیلترها
            </button>
          ) : null}
        </div>
      ) : (
        <>
          {featured ? <FeaturedRow post={featured} /> : null}
          {rest.map((post) => (
            <PostRow key={post.id} post={post} />
          ))}
          <Pagination meta={data.meta} onPage={setPage} />
        </>
      )}
    </TwitterShell>
  );
}
