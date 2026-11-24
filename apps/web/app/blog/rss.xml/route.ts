import { SERVER_API_URL } from '@/lib/site';
import { buildRss, RSS_HEADERS, type RssItem } from '@/lib/rss';
import { SITE_NAME } from '@/lib/seo';

/** `/blog/rss.xml` — RSS 2.0 feed of published blog posts. */
export const revalidate = 1800;

interface BlogPostItem {
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

export async function GET() {
  let items: RssItem[] = [];
  try {
    const response = await fetch(`${SERVER_API_URL}/blog/public?limit=30`, {
      next: { revalidate },
    });
    if (response.ok) {
      const payload = (await response.json()) as {
        data: { items: BlogPostItem[] };
      };
      items = (payload.data?.items ?? []).map((post) => ({
        title: post.title,
        path: `/blog/${post.slug}`,
        description: post.excerpt,
        publishedAt: post.publishedAt ?? post.updatedAt,
      }));
    }
  } catch {
    // Serve an empty-but-valid feed when the API is unreachable.
  }

  return new Response(
    buildRss({
      title: `${SITE_NAME} — بلاگ`,
      description:
        'مقالات و آموزش‌های کارت ویزیت دیجیتال، بیولینک و کسب‌وکار محلی در شمالی کارت.',
      path: '/blog',
      items,
    }),
    { headers: RSS_HEADERS },
  );
}
