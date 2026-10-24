import Link from 'next/link';
import { ArrowLeft, BookOpen, CalendarDays, Play } from 'lucide-react';

import { blogAccent, blogReadMinutes } from '@/lib/blog';
import type { BlogPost } from '@/lib/api';

async function getLatest(): Promise<BlogPost[]> {
  const apiUrl =
    process.env.INTERNAL_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:4000/api';
  try {
    const response = await fetch(`${apiUrl}/blog/public/latest?limit=3`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as { data: BlogPost[] };
    return payload.data ?? [];
  } catch {
    return [];
  }
}

function faDate(value: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('fa-IR');
}

/**
 * Home-page «بلاگ» strip: the three newest published posts, each linking to its
 * full article. A featured post (if any) leads the row.
 */
export async function BlogSection() {
  const posts = await getLatest();
  if (posts.length === 0) return null;

  return (
    <section className="container-page mt-10 sm:mt-16">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="size-5 text-brand" aria-hidden />
          <h2 className="text-xl font-black text-ink">بلاگ</h2>
        </div>
        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-sm font-bold text-brand hover:underline"
        >
          همه‌ی مطالب
          <ArrowLeft className="size-4" aria-hidden />
        </Link>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => {
          const accent = blogAccent(post.id);
          return (
            <article key={post.id} className="indeed-panel group flex flex-col overflow-hidden">
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
                <Link href={`/blog/${post.slug}`}>
                  <h3 className="line-clamp-2 text-base font-extrabold leading-7 text-ink transition group-hover:text-brand">
                    {post.title}
                  </h3>
                </Link>
                {post.excerpt ? (
                  <p className="mt-2 line-clamp-2 text-sm leading-7 text-muted">{post.excerpt}</p>
                ) : null}
                <div className="mt-auto flex items-center gap-3 pt-4 text-[11px] text-muted">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3.5" aria-hidden />
                    {faDate(post.publishedAt ?? post.createdAt)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="size-3.5" aria-hidden />
                    {blogReadMinutes(post.content).toLocaleString('fa-IR')} دقیقه
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
