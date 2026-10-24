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
  { href: '/business-cards?view=notebook&sort=alpha', label: 'دفترچه تلفن' },
  { href: '/feeds', label: 'پست کاربران' },
  { href: '/pulse', label: 'اخبار شهر' },
  { href: '/blog', label: 'بلاگ' },
  { href: '/services', label: 'لیست خدمات' },
  { href: '/guide', label: 'راهنما' },
  { href: '/rules', label: 'قوانین' },
];

/** The «دفترچه تلفن» deep-link's href, so the header can hide just this item. */
export const NOTEBOOK_NAV_HREF = '/business-cards?view=notebook&sort=alpha';

/**
 * The desktop header omits the «دفترچه تلفن» entry (it is a second *look* of the
 * business-card directory, reachable from the view switch on that page and from
 * the footer), keeping the top navigation to the primary destinations only.
 */
export const HEADER_NAV: PublicNavItem[] = PUBLIC_NAV.filter(
  (item) => item.href !== NOTEBOOK_NAV_HREF,
);
