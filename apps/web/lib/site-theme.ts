/**
 * Site-wide visual theme («تم سایت»).
 *
 * The admin picks one theme for the whole site from
 * «تنظیمات ← ظاهر سایت»; it is stored in the API's `Setting` table and exposed
 * on `GET /settings/public`. The root layout reads it server-side and writes
 * `data-theme` on `<html>`, so pages render in the chosen design on the very
 * first paint (no flash). Dark/light remains a per-visitor preference handled
 * client-side by adding the `.dark` class.
 *
 * The four built-in skins are declared here. Newer themes are self-contained
 * modules under `lib/site-themes/` and are merged through
 * {@link EXTRA_SITE_THEMES}; removing one module removes it from the type
 * union, the admin options and the layout mapping in one step.
 */

import { SERVER_API_URL } from './site';
import {
  EXTRA_SITE_THEMES,
  type ExtraSiteThemeKey,
  type SiteThemeDefinition,
} from './site-themes';

const BASE_SITE_THEMES = ['vintage', 'modern', 'bazaar', 'twitter'] as const;

export type BaseSiteTheme = (typeof BASE_SITE_THEMES)[number];
export type SiteTheme = BaseSiteTheme | ExtraSiteThemeKey;

export const SITE_THEMES: readonly SiteTheme[] = [
  ...BASE_SITE_THEMES,
  ...EXTRA_SITE_THEMES.map((theme) => theme.key),
];

export const DEFAULT_SITE_THEME: SiteTheme = 'vintage';

/**
 * The «توییتر» option is a skin of the «نوین» layout: it reuses every
 * structural rule of `data-theme="modern"` and only swaps the palette, so the
 * root layout writes `data-theme="modern"` plus `data-skin="twitter"` for it.
 * Keeping this mapping in one place keeps the server render and the admin's
 * instant preview in sync.
 */
export function siteThemeDocumentAttrs(theme: SiteTheme): {
  theme: string;
  skin: string | null;
} {
  const extra: SiteThemeDefinition | undefined = EXTRA_SITE_THEMES.find(
    (item) => item.key === theme,
  );
  if (extra) {
    return extra.documentAttrs ?? { theme: extra.key, skin: null };
  }
  return theme === 'twitter'
    ? { theme: 'modern', skin: 'twitter' }
    : { theme, skin: null };
}

/** Browser-chrome colour for the active theme (light scheme). */
export function siteThemeThemeColor(theme: SiteTheme): string {
  const extra: SiteThemeDefinition | undefined = EXTRA_SITE_THEMES.find(
    (item) => item.key === theme,
  );
  if (extra) return extra.themeColor.light;
  return theme === 'twitter'
    ? '#FFFFFF'
    : theme === 'modern'
      ? '#F4F6FB'
      : theme === 'bazaar'
        ? '#FFFAF0'
        : '#F2E8D9';
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
    description:
      'ظاهر تخت و مینیمال توییتر/X؛ زمینه‌ی روشن یا سرمه‌ای تیره با کارت‌های ۱۶px و آبی #1c4d8d.',
  },
  ...EXTRA_SITE_THEMES.map((theme) => ({
    key: theme.key,
    name: theme.name,
    description: theme.description,
  })),
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
