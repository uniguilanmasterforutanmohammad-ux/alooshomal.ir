'use client';

import type { ReactNode } from 'react';
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
  Mail,
  Newspaper,
  PenLine,
  ScrollText,
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
  '/guide': HelpCircle,
  '/rules': ScrollText,
  '/contact': Mail,
};

interface Props {
  /**
   * Page-specific call-to-action rendered under the nav (the feed's «ثبت پست»,
   * the news' reporter button, …). `TwitterShell` passes it through.
   */
  action?: ReactNode;
}

/**
 * Desktop navigation rail for the Twitter-style public pages. It replaces the
 * site header on those pages (phones keep the fixed bottom bar), so the visitor
 * still has the brand, primary destinations, a call-to-action and the
 * theme/auth controls in the familiar left-hand column.
 */
export function TwitterRail({ action }: Props) {
  const pathname = usePathname();
  const { token, hydrated } = useAuth();
  const { showNav } = useFeatures();
  const signedIn = hydrated && Boolean(token);
  const items = HEADER_NAV.filter((item) => showNav(item.href));

  return (
    <aside className="tw-rail" aria-label="ناوبری اصلی">
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

      {action ? <div className="tw-rail-action">{action}</div> : null}

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
