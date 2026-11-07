'use client';

import Link from 'next/link';
import { IdCard, LayoutDashboard, LogIn } from 'lucide-react';

import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/lib/auth';
import { useFeatures } from '@/lib/features';
import { HEADER_NAV } from '@/lib/nav';

/**
 * Public top navigation (desktop only; phones/tablets use `MobileNav`).
 *
 * The action buttons are auth-aware:
 *   - signed out: «رایگان شروع کنید» → login (with `next=/dashboard/business-cards`)
 *     plus a secondary «ورود/ثبت‌نام» button.
 *   - signed in: the primary button points straight at the user's business
 *     cards panel and the secondary becomes «پنل کاربری».
 * The old per-item «بیولینک‌های من» / «کارت‌های ویزیت من» buttons are gone —
 * those destinations now live inside the dashboard and the footer.
 */
export function Header() {
  const { token, hydrated } = useAuth();
  const { showNav } = useFeatures();
  const signedIn = hydrated && Boolean(token);
  const navItems = HEADER_NAV.filter((item) => showNav(item.href));

  return (
    <header className="sticky top-[var(--feature-notice-h)] z-50 hidden border-b-2 border-dashed border-[var(--vintage-accent-hover)] bg-[var(--vintage-surface)]/95 backdrop-blur lg:block">
      <div className="container-page flex h-16 items-center justify-between gap-2 xl:gap-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-lg font-extrabold text-brand xl:text-xl"
        >
          <span className="vintage-avatar flex size-9 items-center justify-center">
            <IdCard className="size-5" aria-hidden />
          </span>
          <span>شمالی کارت</span>
        </Link>

        {/* The nav is the flexible middle column. Its gap/type scale is tuned so
            the row fits inside the 1200px page container at every desktop width
            — with `xl:gap-6` the links were ~23px wider than their box and
            «قوانین» spilled under the theme toggle. */}
        <nav className="hidden min-w-0 items-center gap-3 text-[13px] font-medium text-muted lg:flex xl:gap-4 xl:text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              // These repeat on every page; eager prefetching fired ~10 extra
              // RSC requests during the initial load and competed with the
              // render-blocking CSS/fonts (see the Lighthouse report). The
              // footer and mobile bar already disable it for the same reason.
              prefetch={false}
              className="whitespace-nowrap hover:text-brand"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          {/* The secondary button only fits from `xl` up. It is wrapped rather
              than given Tailwind's `hidden` directly: the unlayered
              `.indeed-btn { display: inline-flex }` rule outranks the `hidden`
              utility, so a bare `hidden xl:inline-flex` silently stayed visible
              and pushed «قوانین» under the theme toggle at 1024–1279px. */}
          <div className="hidden xl:flex">
            <Link
              href={signedIn ? '/dashboard' : '/login'}
              className="indeed-btn indeed-btn-secondary"
            >
              {signedIn ? (
                <>
                  <LayoutDashboard className="size-4" aria-hidden />
                  پنل کاربری
                </>
              ) : (
                <>
                  <LogIn className="size-4" aria-hidden />
                  ورود/ثبت‌نام
                </>
              )}
            </Link>
          </div>
          <Link
            href={signedIn ? '/dashboard/business-cards' : '/login?next=/dashboard/business-cards'}
            className="indeed-btn indeed-btn-primary"
          >
            <LayoutDashboard className="size-4" aria-hidden />
            <span className="hidden xl:inline">رایگان شروع کنید</span>
            <span className="xl:hidden">شروع کنید</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
