import Link from 'next/link';
import { Newspaper, UserRound, CalendarDays } from 'lucide-react';

import type { NewsHeadline } from '@/lib/api';

async function getHeadlines(): Promise<NewsHeadline[]> {
  const apiUrl =
    process.env.INTERNAL_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:4000/api';
  try {
    const response = await fetch(`${apiUrl}/news/public/headlines`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as { data: NewsHeadline[] };
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
 * «اخبار شهر» (formerly «نبض شهر») — the home-page news table: a headline next
 * to its publish date and publisher, with a per-row badge and a «مشاهده کامل
 * خبر» button. Follows the reference table layout (badge + title + date +
 * publisher + action) but keeps the site's vintage theme.
 */
export async function PulseSection() {
  const headlines = await getHeadlines();

  if (headlines.length === 0) {
    return null;
  }

  return (
    <section className="container-page mt-10 sm:mt-16" id="pulse">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="vintage-avatar flex size-11 items-center justify-center">
            <Newspaper className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-ink sm:text-xl">اخبار شهر</h2>
            <p className="text-sm text-muted">تازه‌ترین تیترهای خبری شهر</p>
          </div>
        </div>
        <Link href="/pulse" className="indeed-btn indeed-btn-secondary py-2 text-sm">
          مشاهده همه خبرهای شهر
        </Link>
      </div>

      <div className="indeed-panel overflow-hidden">
        <ul>
          {headlines.map((news) => (
            <li
              key={news.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-dashed border-[var(--vintage-border)] px-4 py-4 last:border-b-0"
            >
              <span className="badge-open shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-bold">
                {news.category?.name ?? 'خبر'}
              </span>

              <div className="min-w-48 flex-1">
                <p className="font-bold text-ink">{news.title}</p>
                {news.summary ? (
                  <p className="mt-1 text-xs text-muted">{news.summary}</p>
                ) : null}
              </div>

              <div className="flex items-center gap-4 text-xs text-muted">
                <span className="inline-flex items-center gap-1">
                  <UserRound className="size-3.5" aria-hidden />
                  {news.publisherName ?? 'شهروند خبرنگار'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3.5" aria-hidden />
                  {faDate(news.publishedAt ?? news.createdAt)}
                </span>
              </div>

              <Link
                href={`/pulse/${news.id}`}
                className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
              >
                مشاهده کامل خبر
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
