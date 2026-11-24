import { SERVER_API_URL } from '@/lib/site';
import { buildRss, RSS_HEADERS, type RssItem } from '@/lib/rss';
import { SITE_NAME } from '@/lib/seo';

/** `/pulse/rss.xml` — RSS 2.0 feed of approved city-news items. */
export const revalidate = 1800;

interface NewsItem {
  id: string;
  title: string;
  summary: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export async function GET() {
  let items: RssItem[] = [];
  try {
    const response = await fetch(`${SERVER_API_URL}/news/public?limit=30`, {
      next: { revalidate },
    });
    if (response.ok) {
      const payload = (await response.json()) as {
        data: { items: NewsItem[] };
      };
      items = (payload.data?.items ?? []).map((news) => ({
        title: news.title,
        path: `/pulse/${news.id}`,
        description: news.summary,
        publishedAt: news.publishedAt ?? news.createdAt,
      }));
    }
  } catch {
    // Serve an empty-but-valid feed when the API is unreachable.
  }

  return new Response(
    buildRss({
      title: `${SITE_NAME} — اخبار شهر`,
      description: 'تازه‌ترین خبرهای تأییدشده‌ی شهروندخبرنگاران شمال.',
      path: '/pulse',
      items,
    }),
    { headers: RSS_HEADERS },
  );
}
