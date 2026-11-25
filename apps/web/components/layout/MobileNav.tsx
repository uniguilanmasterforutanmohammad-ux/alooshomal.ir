'use client';

import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BadgeCheck,
  Home,
  IdCard,
  ImagePlus,
  LayoutDashboard,
  Loader2,
  LogIn,
  Newspaper,
  ShoppingCart,
  Wallet,
} from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { useFeatures } from '@/lib/features';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/utils';

interface Item {
  href: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
  /** When set, the item is hidden if that feature is disabled/not visible. */
  feature?: string;
  /** Small count bubble (e.g. cart units). */
  badge?: number;
}

/**
 * Pending indicator for a nav link: while the destination route is loading,
 * the tapped item shows a spinner overlay so the user knows their tap landed.
 */
function NavPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-[var(--vintage-surface)]/70">
      <Loader2 className="size-4 animate-spin text-brand" aria-hidden />
    </span>
  );
}

/**
 * Mobile-only fixed bottom navigation («فوتر موبایل/تبلت»). Replaces the top
 * header on phones/tablets (the header is hidden below `lg`), so the site is
 * thumb-friendly: a fixed bar with icon + label for the primary destinations,
 * plus «داشبورد» when a session exists instead of «ورود».
 */
export function MobileNav() {
  const pathname = usePathname();
  const { token, hydrated } = useAuth();
  const { showNav, isFeatureVisible } = useFeatures();
  const { count: cartCount } = useCart();

  // Hide on the auth screens: they are a focused, full-screen flow.
  const hideOnAuth =
    pathname === '/login' ||
    pathname === '/register';

  const allItems: Item[] = [
    { href: '/', label: 'خانه', icon: Home, exact: true },
    // Short, single-word labels so the bar stays one compact row on narrow
    // phones (the bar is height-reserved by `body` at 56px; a wrapped two-line
    // label would push it taller and hide the last slice of the page).
    { href: '/business-cards', label: 'کارت‌ها', icon: BadgeCheck },
    { href: '/biolinks', label: 'بیولینک', icon: IdCard },
    { href: '/pulse', label: 'اخبار', icon: Newspaper },
    { href: '/feeds', label: 'پست‌ها', icon: ImagePlus },
    { href: '/dashboard/wallet', label: 'کیف پول', icon: Wallet, feature: 'featureWallet' },
    { href: '/cart', label: 'سبد', icon: ShoppingCart, feature: 'featureRetailCart', badge: cartCount },
    hydrated && token
      ? { href: '/dashboard', label: 'داشبورد', icon: LayoutDashboard }
      : { href: '/login', label: 'ورود', icon: LogIn },
  ];
  // Items the admin has hidden (their feature is disabled or not visible).
  const items = allItems.filter(
    (item) =>
      showNav(item.href) &&
      (!item.feature || isFeatureVisible(item.feature)),
  );
  // The grid slot for the theme toggle is `auto`, so hiding a feature never
  // shifts the toggle under a finger that is tapping the adjacent nav item.
  const columns = `repeat(${items.length}, minmax(0, 1fr)) auto`;

  if (hideOnAuth) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-dashed border-[var(--vintage-accent-hover)] bg-[var(--vintage-surface)]/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="ناوبری پایین"
    >
      <ul className="grid" style={{ gridTemplateColumns: columns }}>
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                // Prefetching every nav destination on every page load caused a
                // burst of wasted RSC requests (see the speed report). The
                // bottom bar is reached instantly, so on-demand navigation is
                // plenty and the network stays calm.
                prefetch={false}
                className={cn(
                  'relative flex flex-col items-center gap-0.5 whitespace-nowrap px-0.5 py-2 text-[10px] font-bold transition',
                  active ? 'text-brand' : 'text-muted',
                )}
              >
                <item.icon className="size-5" aria-hidden />
                {item.label}
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-0.5 end-1 flex min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold leading-4 text-white">
                    {item.badge.toLocaleString('fa-IR')}
                  </span>
                ) : null}
                <NavPending />
              </Link>
            </li>
          );
        })}
        <li className="flex items-center justify-center">
          <ThemeToggle />
        </li>
      </ul>
    </nav>
  );
}
