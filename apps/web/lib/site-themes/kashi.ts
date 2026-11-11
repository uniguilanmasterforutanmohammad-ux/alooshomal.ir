import type { SiteThemeDefinition } from './types';

/**
 * «کاشی ایرانی» — Persian tile theme.
 *
 * The visual rules live in `app/themes/kashi.css` and are scoped to
 * `html[data-theme='kashi']`. This module only carries the metadata the admin
 * panel and the root layout need.
 */
export const kashiTheme = {
  key: 'kashi',
  name: 'کاشی ایرانی',
  description:
    'الهام از کاشی‌کاری اصفهان: لاجورد، فیروزه و طلا با نقش‌های هندسی و قاب‌های ظریف.',
  themeColor: { light: '#f6f1e6', dark: '#06121b' },
} as const satisfies SiteThemeDefinition;
