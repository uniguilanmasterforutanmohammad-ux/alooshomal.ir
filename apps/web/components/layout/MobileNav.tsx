'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BadgeCheck,
  Home,
  IdCard,
  ImagePlus,
  LayoutDashboard,
  LogIn,
  Newspaper,
} from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { useFeatures } from '@/lib/features';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/utils';

interface Item {
  href: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
}

/**
 * Mobile-only fixed bottom navigation. Replaces the top header on phones
 * (the header is hidden below `md`), so the site is thumb-friendly: a fixed
 * bar with icon + label for the primary destinations, plus «داشبورد»
 * when a session exists instead of «ورود».
 */
export function MobileNav() {
  const pathname = usePathname();
  const { token, hydrated } = useAuth();
  const { showNav } = useFeatures();

  // Hide on the auth screens: they are a focused, full-screen flow.
  const hideOnAuth = pathname === '/login' || pathname === '/register';

  const allItems: Item[] = [
    { href: '/', label: 'خانه', icon: Home, exact: true },
    { href: '/business-cards', label: 'کارت ویزیت‌ها', icon: BadgeCheck },
    { href: '/biolinks', label: 'بیولینک‌ها', icon: IdCard },
    { href: '/pulse', label: 'اخبار شهر', icon: Newspaper },
    { href: '/feeds', label: 'پست کاربران', icon: ImagePlus },
    hydrated && token
      ? { href: '/dashboard', label: 'داشبورد', icon: LayoutDashboard }
      : { href: '/login', label: 'ورود', icon: LogIn },
  ];
  // Items the admin has hidden (their feature is disabled or not visible).
  const items = allItems.filter((item) => showNav(item.href));
  // The theme toggle always takes one slot, so the grid follows the item count.
  const columns = items.length + 1;

  if (hideOnAuth) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-dashed border-[var(--vintage-accent-hover)] bg-[#fbf3e9]/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="ناوبری پایین"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
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
                  'flex flex-col items-center gap-0.5 px-0.5 py-2 text-[10px] font-bold transition',
                  active ? 'text-brand' : 'text-muted',
                )}
              >
                <item.icon className="size-5" aria-hidden />
                {item.label}
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
