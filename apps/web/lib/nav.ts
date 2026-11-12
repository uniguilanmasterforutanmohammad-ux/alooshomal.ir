/**
 * Primary public navigation. The desktop header renders it horizontally (minus
 * the «دفترچه تلفن» deep-link, which is a second look of the business-card
 * directory) and the mobile bottom bar mirrors its main destinations; the footer
 * intentionally stays quiet and only carries the legal/support links.
 */
export interface PublicNavItem {
  href: string;
  label: string;
}

export const PUBLIC_NAV: PublicNavItem[] = [
  { href: '/categories', label: 'مشاغل' },
  { href: '/business-cards', label: 'کارت‌های ویزیت' },
  { href: '/biolinks', label: 'بیولینک‌ها' },
  { href: '/business-cards?view=notebook&sort=alpha', label: 'دفترچه تلفن' },
  { href: '/feeds', label: 'پست‌ها' },
  { href: '/pulse', label: 'اخبار' },
  { href: '/blog', label: 'بلاگ' },
  { href: '/pricing', label: 'تعرفه‌ها' },
  { href: '/guide', label: 'راهنما' },
  { href: '/rules', label: 'قوانین' },
  { href: '/contact', label: 'تماس' },
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
