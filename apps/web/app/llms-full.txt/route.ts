import { absoluteUrl, SERVER_API_URL } from '@/lib/site';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from '@/lib/seo';

/**
 * `/llms-full.txt` — the long-form companion to `/llms.txt`.
 *
 * AI answer engines use it to cite fresh, first-party content (blog posts and
 * city news) with canonical URLs and dates. Only published/approved rows are
 * fetched, and the payload is bounded so a large directory never bloats the
 * response. Revalidated hourly like the sitemap.
 */
export const revalidate = 3600;

interface BlogItem {
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

interface NewsItem {
  id: string;
  title: string;
  summary: string | null;
  publishedAt: string | null;
  createdAt: string;
}

function clean(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isoDate(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${SERVER_API_URL}${path}`, {
      next: { revalidate },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function GET() {
  const [blog, news] = await Promise.all([
    fetchJson<{ data: { items: BlogItem[] } }>('/blog/public?limit=20'),
    fetchJson<{ data: { items: NewsItem[] } }>('/news/public?limit=20'),
  ]);

  const lines: string[] = [
    `# ${SITE_NAME} — نسخه‌ی کامل`,
    '',
    `> ${SITE_DESCRIPTION}`,
    '',
    `شمالی کارت: ${SITE_TAGLINE}. این سند خلاصه‌ی محتوای عمومی و تازه‌ی سایت را`,
    'برای استناد موتورهای پاسخ هوش مصنوعی فراهم می‌کند. همه‌ی لینک‌ها canonical هستند.',
    '',
    '## بخش‌های اصلی',
    `- دایرکتوری کسب‌وکارها: ${absoluteUrl('/business-cards')}`,
    `- دسته‌بندی مشاغل: ${absoluteUrl('/categories')}`,
    `- بیولینک‌ها: ${absoluteUrl('/biolinks')}`,
    `- اخبار شهر: ${absoluteUrl('/pulse')}`,
    `- اقامتگاه‌ها: ${absoluteUrl('/stay')}`,
    `- فروشگاه‌ها: ${absoluteUrl('/shop')}`,
    `- بلاگ: ${absoluteUrl('/blog')}`,
    '',
  ];

  const blogItems = blog?.data?.items ?? [];
  if (blogItems.length > 0) {
    lines.push('## تازه‌ترین مطالب بلاگ', '');
    for (const post of blogItems) {
      const date = isoDate(post.publishedAt ?? post.updatedAt);
      const excerpt = clean(post.excerpt);
      lines.push(
        `### ${post.title}`,
        `- لینک: ${absoluteUrl(`/blog/${post.slug}`)}`,
        ...(date ? [`- تاریخ: ${date}`] : []),
        ...(excerpt ? ['', excerpt] : []),
        '',
      );
    }
  }

  const newsItems = news?.data?.items ?? [];
  if (newsItems.length > 0) {
    lines.push('## تازه‌ترین اخبار شهر', '');
    for (const item of newsItems) {
      const date = isoDate(item.publishedAt ?? item.createdAt);
      const summary = clean(item.summary);
      lines.push(
        `### ${item.title}`,
        `- لینک: ${absoluteUrl(`/pulse/${item.id}`)}`,
        ...(date ? [`- تاریخ: ${date}`] : []),
        ...(summary ? ['', summary] : []),
        '',
      );
    }
  }

  lines.push(
    '## سیاست محتوا',
    '- فقط صفحات منتشرشده و تأییدشده در این سند می‌آیند.',
    '- صفحات پنل کاربری، مدیریت، احراز هویت و پرداخت عمومی نیستند.',
    `- نقشه‌ی کامل: ${absoluteUrl('/sitemap.xml')}`,
    '',
  );

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
