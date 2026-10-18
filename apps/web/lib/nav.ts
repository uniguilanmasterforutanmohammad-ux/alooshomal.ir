/**
 * Primary public navigation shown in the desktop header (horizontally) and the
 * footer (as a stacked column), so both stay in sync from one source.
 */
export interface PublicNavItem {
  href: string;
  label: string;
}

export const PUBLIC_NAV: PublicNavItem[] = [
  { href: '/business-cards', label: 'لیست کارت ویزیت‌ها' },
  { href: '/biolinks', label: 'لیست بیولینک‌ها' },
  { href: '/feeds', label: 'پست کاربران' },
  { href: '/pulse', label: 'اخبار شهر' },
  { href: '/services', label: 'لیست خدمات' },
  { href: '/guide', label: 'راهنما' },
  { href: '/rules', label: 'قوانین' },
];
