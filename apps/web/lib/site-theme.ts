/**
 * Site-wide visual theme («تم سایت»).
 *
 * The admin picks one theme for the whole site from
 * «تنظیمات ← ظاهر سایت»; it is stored in the API's `Setting` table and exposed
 * on `GET /settings/public`. The root layout reads it server-side and writes
 * `data-theme` on `<html>`, so pages render in the chosen design on the very
 * first paint (no flash). Dark/light remains a per-visitor preference handled
 * client-side by adding the `.dark` class.
 */

import { SERVER_API_URL } from './site';

export const SITE_THEMES = ['vintage', 'modern', 'bazaar', 'twitter'] as const;
export type SiteTheme = (typeof SITE_THEMES)[number];
export const DEFAULT_SITE_THEME: SiteTheme = 'vintage';

/**
 * The «توییتر» option is a skin of the «نوین» layout: it reuses every
 * structural rule of `data-theme="modern"` and only swaps the palette, so the
 * root layout writes `data-theme="modern"` plus `data-skin="twitter"` for it.
 * Keeping this mapping in one place keeps the server render and the admin's
 * instant preview in sync.
 */
export function siteThemeDocumentAttrs(theme: SiteTheme): {
  theme: Exclude<SiteTheme, 'twitter'>;
  skin: 'twitter' | null;
} {
  return theme === 'twitter'
    ? { theme: 'modern', skin: 'twitter' }
    : { theme, skin: null };
}

export const SITE_THEME_OPTIONS: Array<{
  key: SiteTheme;
  name: string;
  description: string;
}> = [
  {
    key: 'vintage',
    name: 'کلاسیک (وینتیج)',
    description: 'ظاهر کاغذی و گرم فعلی؛ قاب‌های خط‌چین و رنگ خاکی.',
  },
  {
    key: 'modern',
    name: 'نوین (مدرن)',
    description: 'ظاهر تمیز و کارت‌محور با گوشه‌های نرم، سایه‌های ملایم و رنگ نیلی.',
  },
  {
    key: 'bazaar',
    name: 'بازارچه (شاد و کودکانه)',
    description: 'الهام‌گرفته از بازارچه‌ی کودکان؛ سبز جنگلی، نعنایی و زرد آفتابی با کارت‌های گرد.',
  },
  {
    key: 'twitter',
    name: 'توییتر (روشن/تیره)',
    description: 'ظاهر تخت و مینیمال توییتر/X؛ زمینه‌ی سفید یا مشکی، خطوط نازک و آبی #1d9bf0.',
  },
];

export function isSiteTheme(value: unknown): value is SiteTheme {
  return (
    value === 'vintage' ||
    value === 'modern' ||
    value === 'bazaar' ||
    value === 'twitter'
  );
}

/**
 * Server-side read of the admin-chosen theme. A short revalidation keeps every
 * statically rendered page fast while still picking up an admin switch within
 * seconds; on failure the original theme is used so the site never breaks.
 */
export async function getSiteTheme(): Promise<SiteTheme> {
  try {
    const response = await fetch(`${SERVER_API_URL}/settings/public`, {
      next: { revalidate: 10, tags: ['site-theme'] },
    });
    if (!response.ok) return DEFAULT_SITE_THEME;
    const payload = (await response.json()) as {
      data?: { siteTheme?: unknown } | null;
    };
    const value = payload.data?.siteTheme;
    return isSiteTheme(value) ? value : DEFAULT_SITE_THEME;
  } catch {
    return DEFAULT_SITE_THEME;
  }
}
