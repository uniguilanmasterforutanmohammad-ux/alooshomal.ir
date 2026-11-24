import { absoluteUrl } from '@/lib/site';
import {
  SITE_DESCRIPTION,
  SITE_EMAIL,
  SITE_NAME,
  SITE_PHONE_DISPLAY,
  SITE_TAGLINE,
} from '@/lib/seo';

/**
 * `/llms.txt` — the machine-readable site index proposed by llmstxt.org.
 *
 * AI answer engines (ChatGPT search, Perplexity, Claude, Gemini) discover the
 * canonical public sections of the site here instead of guessing from a single
 * HTML page. Keep it short, factual and link-first; long-form content lives in
 * `/llms-full.txt`.
 */
export const revalidate = 3600;

const SECTIONS: Array<{ title: string; path: string; description: string }> = [
  {
    title: 'دسته‌بندی مشاغل',
    path: '/categories',
    description: 'فهرست دسته‌بندی‌های کسب‌وکارهای شمال با تعداد و امتیاز.',
  },
  {
    title: 'کارت‌های ویزیت دیجیتال',
    path: '/business-cards',
    description: 'دفترچه تلفن و دایرکتوری کارت ویزیت کسب‌وکارها؛ قابل جست‌وجو بر اساس شهر و دسته.',
  },
  {
    title: 'بیولینک‌ها',
    path: '/biolinks',
    description: 'بیولینک‌های عمومی افراد و کسب‌وکارها با راه‌های ارتباطی.',
  },
  {
    title: 'اخبار شهر',
    path: '/pulse',
    description: 'خبرهای تأییدشده‌ی شهروندخبرنگاران شمال.',
  },
  {
    title: 'پست‌ها',
    path: '/feeds',
    description: 'جریان پست‌های کوتاه کسب‌وکارها و کاربران.',
  },
  {
    title: 'اقامتگاه‌های اجاره‌ای',
    path: '/stay',
    description: 'دایرکتوری اقامتگاه‌های روزانه در شمال با قیمت و ظرفیت.',
  },
  {
    title: 'فروشگاه‌ها',
    path: '/shop',
    description: 'فروشگاه‌های آنلاین محلی و محصولات منتشرشده.',
  },
  {
    title: 'بلاگ',
    path: '/blog',
    description: 'مقالات و آموزش‌های کارت ویزیت دیجیتال، بیولینک و کسب‌وکار محلی.',
  },
  {
    title: 'تعرفه‌ها',
    path: '/pricing',
    description: 'پلن‌های اشتراک و هزینه‌ی خدمات پلتفرم.',
  },
  {
    title: 'راهنمای استفاده',
    path: '/guide',
    description: 'گام‌به‌گام ساخت حساب، کارت ویزیت و بیولینک.',
  },
  {
    title: 'قوانین و مقررات',
    path: '/rules',
    description: 'شرایط استفاده، محتوای مجاز و حریم خصوصی.',
  },
  {
    title: 'تماس با ما',
    path: '/contact',
    description: 'راه‌های ارتباط با پشتیبانی.',
  },
];

export function GET() {
  const lines: string[] = [
    `# ${SITE_NAME}`,
    '',
    `> ${SITE_DESCRIPTION}`,
    '',
    `شمالی کارت یک ${SITE_TAGLINE} است. محتوای عمومی شامل دایرکتوری کسب‌وکارها،`,
    'دفترچه تلفن، بیولینک‌ها، اخبار شهر، اقامتگاه‌ها، فروشگاه‌ها و بلاگ است.',
    'صفحات پنل کاربری، مدیریت و پرداخت خصوصی‌اند و در نقشه‌ی سایت نیستند.',
    '',
    '## بخش‌های عمومی',
    ...SECTIONS.map(
      (section) => `- [${section.title}](${absoluteUrl(section.path)}): ${section.description}`,
    ),
    '',
    '## منابع',
    `- [نقشه‌ی سایت](${absoluteUrl('/sitemap.xml')}): فهرست کامل URLهای عمومی.`,
    `- [نسخه‌ی کامل برای مدل‌ها](${absoluteUrl('/llms-full.txt')}): خلاصه‌ی محتوای تازه‌ی بلاگ و اخبار.`,
    `- [خوراک RSS بلاگ](${absoluteUrl('/blog/rss.xml')}) و [خوراک RSS اخبار](${absoluteUrl('/pulse/rss.xml')}).`,
    `- [robots.txt](${absoluteUrl('/robots.txt')}): قواعد خزش.`,
    '',
    '## تماس',
    `- ایمیل: ${SITE_EMAIL}`,
    `- تلفن: ${SITE_PHONE_DISPLAY}`,
    `- وب‌سایت: ${absoluteUrl('/')}`,
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
