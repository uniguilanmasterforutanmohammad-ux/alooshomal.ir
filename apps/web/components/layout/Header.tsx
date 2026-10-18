'use client';

import Link from 'next/link';
import { IdCard, LayoutDashboard, LogIn } from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { PUBLIC_NAV } from '@/lib/nav';

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
  const signedIn = hydrated && Boolean(token);

  return (
    <header className="sticky top-0 z-50 hidden border-b-2 border-dashed border-[var(--vintage-accent-hover)] bg-[#fbf3e9]/95 backdrop-blur lg:block">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-extrabold text-brand">
          <span className="vintage-avatar flex size-9 items-center justify-center">
            <IdCard className="size-5" aria-hidden />
          </span>
          <span>شمالی کارت</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted lg:flex">
          {PUBLIC_NAV.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-brand">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
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
          <Link
            href={signedIn ? '/dashboard/business-cards' : '/login?next=/dashboard/business-cards'}
            className="indeed-btn indeed-btn-primary"
          >
            <LayoutDashboard className="size-4" aria-hidden />
            رایگان شروع کنید
          </Link>
        </div>
      </div>
    </header>
  );
}
