import Link from 'next/link';
import { ArrowRight, BookOpen, CalendarDays, Eye, Tag, UserRound } from 'lucide-react';

import { BlogVideoPlayer } from '@/components/blog/BlogVideoPlayer';
import { blogAccent, blogReadMinutes } from '@/lib/blog';
import { bodyToHtml } from '@/lib/rich-text';
import type { BlogPost } from '@/lib/api';

const PLACEHOLDER_COVER =
  'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&q=60';

function faDate(value: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('fa-IR');
}

/**
 * Full blog post: hero cover (or Aparat poster), title + meta line, the rich
 * body, an embedded Aparat video when the post has one, and the tag list.
 * Server-rendered so the content is crawlable.
 */
export function BlogPostView({ post }: { post: BlogPost }) {
  const accent = blogAccent(post.id);
  const html = bodyToHtml(post.content ?? '');

  return (
    <main className="container-page max-w-3xl py-8">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1 text-sm font-bold text-brand"
      >
        <ArrowRight className="size-4" aria-hidden />
        بازگشت به بلاگ
      </Link>

      <article className="mt-4">
        <div
          className="relative aspect-[16/7] w-full overflow-hidden rounded-2xl border border-[var(--vintage-border)]"
          style={{ backgroundColor: `${accent}1a` }}
        >
          {post.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.coverImageUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center">
              <BookOpen className="size-14" style={{ color: accent }} aria-hidden />
            </span>
          )}
        </div>

        {post.category ? (
          <span
            className="mt-5 inline-block rounded-full px-3 py-1 text-xs font-bold"
            style={{ backgroundColor: `${accent}22`, color: accent }}
          >
            {post.category.name}
          </span>
        ) : null}

        <h1 className="mt-3 text-3xl font-black leading-[1.5] text-ink">{post.title}</h1>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-dashed border-[var(--vintage-border)] pb-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <UserRound className="size-4" aria-hidden />
            {post.author?.fullName ?? 'تیم شمالی کارت'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" aria-hidden />
            {faDate(post.publishedAt ?? post.createdAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Eye className="size-4" aria-hidden />
            {post.viewCount.toLocaleString('fa-IR')} بازدید
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="size-4" aria-hidden />
            {blogReadMinutes(post.content).toLocaleString('fa-IR')} دقیقه مطالعه
          </span>
        </div>

        {post.excerpt ? (
          <p className="mt-6 border-s-4 border-brand-light ps-4 text-base font-bold leading-8 text-ink-soft">
            {post.excerpt}
          </p>
        ) : null}

        {post.videoId ? (
          <section className="mt-7">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-ink">
              <span className="inline-block h-4 w-1 rounded bg-brand" aria-hidden />
              ویدیوی این مطلب
            </h2>
            <BlogVideoPlayer videoId={post.videoId} title={post.title} cover={post.coverImageUrl} />
          </section>
        ) : null}

        {html ? (
          <div
            className="blog-rich mt-7 text-base leading-9 text-ink-soft"
            // Sanitised through the allow-list in `lib/rich-text`.
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : null}

        {post.tags.length ? (
          <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-dashed border-[var(--vintage-border)] pt-5">
            <Tag className="size-4 text-muted" aria-hidden />
            {post.tags.map((tag) => (
              <Link
                key={tag}
                href={`/blog?q=${encodeURIComponent(tag)}`}
                className="rounded-full border border-[var(--vintage-border)] px-3 py-1 text-xs font-bold text-muted transition hover:border-brand hover:text-brand"
              >
                {tag}
              </Link>
            ))}
          </div>
        ) : null}
      </article>
    </main>
  );
}

export { PLACEHOLDER_COVER };
