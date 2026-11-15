/**
 * Site-wide visual theme («تم سایت»).
 *
 * Only the Twitter/X skin remains. It reuses the «نوین» layout and swaps the
 * palette, so the root layout writes `data-theme="modern"` plus
 * `data-skin="twitter"`. The value is stored in the API's `Setting` table and
 * read server-side, so the theme is applied on the very first paint.
 */

import { SERVER_API_URL } from './site';

export type SiteTheme = 'twitter';

export const SITE_THEMES: readonly SiteTheme[] = ['twitter'];

export const DEFAULT_SITE_THEME: SiteTheme = 'twitter';

/** The Twitter skin always reuses the modern layout. */
export function siteThemeDocumentAttrs(theme: SiteTheme): {
  theme: string;
  skin: string | null;
} {
  void theme;
  return { theme: 'modern', skin: 'twitter' };
}

/** Browser-chrome colour for the active theme (light scheme). */
export function siteThemeThemeColor(theme: SiteTheme): string {
  void theme;
  return '#FFFFFF';
}

export const SITE_THEME_OPTIONS: Array<{
  key: SiteTheme;
  name: string;
  description: string;
}> = [
  {
    key: 'twitter',
    name: 'توییتر (روشن/تیره)',
    description:
      'ظاهر تخت و مینیمال توییتر/X؛ زمینه‌ی روشن یا سرمه‌ای تیره با کارت‌های ۱۶px و آبی #1c4d8d.',
  },
];

export function isSiteTheme(value: unknown): value is SiteTheme {
  return (
    typeof value === 'string' &&
    (SITE_THEMES as readonly string[]).includes(value)
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
