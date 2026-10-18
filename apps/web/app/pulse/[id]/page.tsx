import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, CalendarDays, UserRound } from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { type NewsItem } from '@/lib/api';

async function getNews(id: string): Promise<NewsItem | null> {
  const apiUrl =
    process.env.INTERNAL_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:4000/api';
  try {
    const response = await fetch(`${apiUrl}/news/public/${id}`, { cache: 'no-store' });
    if (!response.ok) return null;
    const payload = (await response.json()) as { data: NewsItem };
    return payload.data;
  } catch {
    return null;
  }
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const news = await getNews(id);
  if (!news) {
    notFound();
  }

  const published = news.publishedAt ?? news.createdAt;

  return (
    <>
      <Header />
      <main className="container-page py-8">
        <Link href="/pulse" className="inline-flex items-center gap-1 text-sm font-bold text-brand">
          <ArrowRight className="size-4" aria-hidden />
          بازگشت به اخبار شهر
        </Link>

        <article className="indeed-panel mt-4 p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="badge-open rounded-md border px-2 py-0.5 text-[11px] font-bold">
              {news.category?.name ?? 'خبر'}
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-extrabold leading-snug text-ink">
            {news.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <UserRound className="size-3.5" aria-hidden />
              {news.publisherName ?? news.author?.fullName ?? 'شهروند خبرنگار'}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" aria-hidden />
              {new Date(published).toLocaleDateString('fa-IR')}
            </span>
          </div>

          {news.summary ? (
            <p className="mt-5 border-s-4 border-brand-light ps-4 text-sm font-bold leading-7 text-ink-soft">
              {news.summary}
            </p>
          ) : null}

          {news.body ? (
            <div className="mt-6 whitespace-pre-line text-sm leading-8 text-ink-soft">
              {news.body}
            </div>
          ) : null}
        </article>
      </main>
      <Footer />
    </>
  );
}
