'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, CalendarDays, Eye, Play, Search, Sparkles, Tag } from 'lucide-react';

import { api, type BlogCategory, type BlogListResponse, type BlogPost } from '@/lib/api';
import { blogAccent, blogReadMinutes } from '@/lib/blog';
import { Pagination } from '@/components/ui/Pagination';

function faDate(value: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('fa-IR');
}

/** One post card used in the grid. */
function PostCard({ post }: { post: BlogPost }) {
  const accent = blogAccent(post.id);
  return (
    <article className="indeed-panel group flex flex-col overflow-hidden">
      <Link href={`/blog/${post.slug}`} className="relative block aspect-video overflow-hidden">
        {post.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverImageUrl}
            alt=""
            className="size-full object-cover transition group-hover:scale-105"
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
      </Link>

      <div className="flex flex-1 flex-col p-4">
        {post.category ? (
          <span
            className="mb-2 w-fit rounded-full px-2.5 py-0.5 text-[11px] font-bold"
            style={{ backgroundColor: `${accent}22`, color: accent }}
          >
            {post.category.name}
          </span>
        ) : null}
        <Link href={`/blog/${post.slug}`}>
          <h3 className="line-clamp-2 text-base font-extrabold leading-7 text-ink transition group-hover:text-brand">
            {post.title}
          </h3>
        </Link>
        {post.excerpt ? (
          <p className="mt-2 line-clamp-3 text-sm leading-7 text-muted">{post.excerpt}</p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" aria-hidden />
            {faDate(post.publishedAt ?? post.createdAt)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="size-3.5" aria-hidden />
            {post.viewCount.toLocaleString('fa-IR')}
          </span>
          <span className="inline-flex items-center gap-1">
            <BookOpen className="size-3.5" aria-hidden />
            {blogReadMinutes(post.content).toLocaleString('fa-IR')} دقیقه
          </span>
        </div>
      </div>
    </article>
  );
}

/**
 * «بلاگ» index: a searchable, category-filtered grid of published posts with
 * pagination. Empty state nudges the visitor back to the main sections.
 */
export function BlogIndex() {
  const [data, setData] = useState<BlogListResponse | null>(null);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <main className="container-page py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="vintage-avatar flex size-12 items-center justify-center">
            <BookOpen className="size-6" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-ink">بلاگ شمالی کارت</h1>
            <p className="mt-1 text-sm text-muted">
              مقالات، آموزش‌ها و ویدیوهای آپارات برای رشد کسب‌وکار محلی.
            </p>
          </div>
        </div>
      </header>

      <form
        className="mt-6 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          setQ(draft.trim());
        }}
      >
        <div className="relative flex flex-1 items-center rounded-lg border border-[var(--indeed-border)] bg-white shadow-sm">
          <Search className="pointer-events-none absolute end-3 size-4 text-muted" aria-hidden />
          <input
            className="h-11 w-full bg-transparent px-4 pe-10 text-sm outline-none"
            placeholder="جستجو در مطالب بلاگ…"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </div>
        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="h-11 rounded-lg border border-[var(--indeed-border)] bg-white px-3 text-sm outline-none sm:w-52"
        >
          <option value="">همه دسته‌ها</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <button type="submit" className="indeed-btn indeed-btn-primary h-11 px-6">
          جستجو
        </button>
      </form>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : null}

      {loading ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="indeed-panel h-72 animate-pulse bg-soft" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="indeed-panel mt-6 p-12 text-center">
          <p className="text-lg font-bold text-ink">مطلبی یافت نشد</p>
          <p className="mt-2 text-sm text-muted">
            عبارت جستجو یا دسته‌بندی را تغییر دهید.
          </p>
        </div>
      ) : (
        <>
          {featured ? (
            <section className="mt-6 grid gap-5 lg:grid-cols-2">
              <Link
                href={`/blog/${featured.slug}`}
                className="indeed-panel group relative block overflow-hidden"
              >
                <div className="relative aspect-video overflow-hidden">
                  {featured.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={featured.coverImageUrl}
                      alt=""
                      className="size-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <span
                      className="flex size-full items-center justify-center"
                      style={{ backgroundColor: `${blogAccent(featured.id)}22` }}
                    >
                      <Sparkles
                        className="size-12"
                        style={{ color: blogAccent(featured.id) }}
                        aria-hidden
                      />
                    </span>
                  )}
                </div>
              </Link>
              <div className="indeed-panel flex flex-col justify-center p-6">
                <span className="flex w-fit items-center gap-1 rounded-full bg-brand-light px-3 py-1 text-[11px] font-bold text-brand">
                  <Sparkles className="size-3.5" aria-hidden />
                  مطلب شاخص
                </span>
                <Link href={`/blog/${featured.slug}`}>
                  <h2 className="mt-3 text-2xl font-extrabold leading-9 text-ink transition hover:text-brand">
                    {featured.title}
                  </h2>
                </Link>
                {featured.excerpt ? (
                  <p className="mt-3 text-sm leading-7 text-muted">{featured.excerpt}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted">
                  {featured.category ? (
                    <span className="inline-flex items-center gap-1">
                      <Tag className="size-3.5" aria-hidden />
                      {featured.category.name}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3.5" aria-hidden />
                    {faDate(featured.publishedAt ?? featured.createdAt)}
                  </span>
                  {featured.videoId ? (
                    <span className="inline-flex items-center gap-1 font-bold text-brand">
                      <Play className="size-3.5" aria-hidden />
                      همراه ویدیو
                    </span>
                  ) : null}
                </div>
                <Link
                  href={`/blog/${featured.slug}`}
                  className="indeed-btn indeed-btn-primary mt-5 w-fit py-2 text-sm"
                >
                  خواندن مطلب
                </Link>
              </div>
            </section>
          ) : null}

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          {data ? <Pagination meta={data.meta} onPage={setPage} /> : null}
        </>
      )}
    </main>
  );
}
