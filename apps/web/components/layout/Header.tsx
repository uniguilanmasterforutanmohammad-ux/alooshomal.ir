'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, LogIn } from 'lucide-react';

import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/lib/auth';
import { useFeatures } from '@/lib/features';
import { HEADER_NAV } from '@/lib/nav';
import { cn } from '@/lib/utils';

/**
 * Public top navigation (desktop only).
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
  const pathname = usePathname();
  const { token, hydrated } = useAuth();
  const { showNav } = useFeatures();
  const signedIn = hydrated && Boolean(token);
  const navItems = HEADER_NAV.filter((item) => showNav(item.href));

  return (
    <header className="sticky top-[var(--feature-notice-h)] z-50 hidden border-b-2 border-dashed border-[var(--vintage-accent-hover)] bg-[var(--vintage-surface)]/95 backdrop-blur lg:block">
      <div className="container-page flex h-16 items-center justify-between gap-2 xl:gap-4">
        <Link
          href="/"
          aria-label="شمالی کارت — صفحه اصلی"
          className="flex shrink-0 items-center"
        >
          <Image
            src="/shomali-card-calligraphy.svg"
            alt="شمالی کارت"
            width={148}
            height={72}
            priority
            unoptimized
            className="h-9 w-auto dark:invert xl:h-10"
          />
        </Link>

        {/* The nav is the flexible middle column. Each link is a standard
            padded pill (hover background + active state) so the row reads as
            proper navigation rather than cramped text. The type scale and
            horizontal padding grow only from `xl` up, where the secondary
            button also appears; at `lg` the tighter padding keeps all nine
            links inside the 1200px container without spilling under the
            theme toggle. */}
        <nav className="hidden min-w-0 items-center gap-0 text-[12px] font-medium text-muted lg:flex xl:text-[13px]">
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                // These repeat on every page; eager prefetching fired ~10 extra
                // RSC requests during the initial load and competed with the
                // render-blocking CSS/fonts (see the Lighthouse report). The
                // footer and mobile bar already disable it for the same reason.
                prefetch={false}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'whitespace-nowrap rounded-lg px-0.5 py-1.5 transition hover:bg-soft hover:text-brand xl:px-1',
                  active && 'bg-brand-light font-bold text-brand',
                )}
              >
                {item.label}
              </Link>
            );
          })}
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
