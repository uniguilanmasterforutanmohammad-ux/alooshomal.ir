'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BadgeCheck,
  BookOpen,
  HelpCircle,
  Home,
  IdCard,
  LayoutDashboard,
  LogIn,
  Newspaper,
  PenLine,
  ScrollText,
  Wrench,
} from 'lucide-react';

import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/lib/auth';
import { useFeatures } from '@/lib/features';
import { HEADER_NAV } from '@/lib/nav';
import { cn } from '@/lib/utils';

const ICONS: Record<string, typeof Home> = {
  '/business-cards': BadgeCheck,
  '/biolinks': IdCard,
  '/feeds': PenLine,
  '/pulse': Newspaper,
  '/blog': BookOpen,
  '/services': Wrench,
  '/guide': HelpCircle,
  '/rules': ScrollText,
};

/**
 * Desktop navigation rail for the Twitter-style `/feeds` page. It replaces the
 * site header on this page (phones keep the fixed bottom bar), so the visitor
 * still has the brand, primary destinations, the composer shortcut and the
 * theme/auth controls — all in the familiar left-hand column.
 */
export function FeedRail() {
  const pathname = usePathname();
  const { token, hydrated } = useAuth();
  const { showNav } = useFeatures();
  const signedIn = hydrated && Boolean(token);
  const items = HEADER_NAV.filter((item) => showNav(item.href));

  return (
    <aside className="tw-rail" aria-label="ناوبری فید">
      <Link href="/" className="tw-rail-link tw-rail-brand">
        <span className="vintage-avatar flex size-11 shrink-0 items-center justify-center">
          <IdCard className="size-5" aria-hidden />
        </span>
        <span className="tw-rail-brand-text text-lg font-extrabold text-brand">
          شمالی کارت
        </span>
      </Link>

      <nav className="mt-2 flex flex-col gap-1">
        {items.map((item) => {
          const Icon = ICONS[item.href] ?? Home;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              aria-current={active ? 'page' : undefined}
              className="tw-rail-link"
            >
              <Icon className="size-6" aria-hidden />
              <span className="tw-rail-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <Link
        href="/dashboard/feeds"
        className="indeed-btn indeed-btn-primary tw-rail-cta mt-4 justify-center rounded-full py-3 text-sm"
      >
        <PenLine className="size-5" aria-hidden />
        <span className="tw-rail-label">ثبت پست</span>
      </Link>

      <div className="mt-auto flex flex-col gap-1 pt-8">
        <Link
          href={signedIn ? '/dashboard' : '/login'}
          className={cn('tw-rail-link', signedIn && 'text-ink')}
        >
          {signedIn ? (
            <LayoutDashboard className="size-6" aria-hidden />
          ) : (
            <LogIn className="size-6" aria-hidden />
          )}
          <span className="tw-rail-label">
            {signedIn ? 'پنل کاربری' : 'ورود / ثبت‌نام'}
          </span>
        </Link>
        <div className="px-2 pt-1">
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
