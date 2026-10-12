'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BadgeCheck, Home, IdCard, LayoutDashboard, LogIn } from 'lucide-react';

import { useAuth } from '@/lib/auth';
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
 * bar with icon + label for the four primary destinations, plus «داشبورد»
 * when a session exists instead of «ورود».
 */
export function MobileNav() {
  const pathname = usePathname();
  const { token, hydrated } = useAuth();

  // Hide on the auth screens: they are a focused, full-screen flow.
  const hideOnAuth = pathname === '/login' || pathname === '/register';

  const items: Item[] = [
    { href: '/', label: 'خانه', icon: Home, exact: true },
    { href: '/business-cards', label: 'کارت ویزیت‌ها', icon: BadgeCheck },
    { href: '/biolinks', label: 'بیولینک‌ها', icon: IdCard },
    hydrated && token
      ? { href: '/dashboard', label: 'داشبورد', icon: LayoutDashboard }
      : { href: '/login', label: 'ورود', icon: LogIn },
  ];

  if (hideOnAuth) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-dashed border-[var(--vintage-accent-hover)] bg-[#fbf3e9]/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="ناوبری پایین"
    >
      <ul className="grid grid-cols-4">
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-bold transition',
                  active ? 'text-brand' : 'text-muted',
                )}
              >
                <item.icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
