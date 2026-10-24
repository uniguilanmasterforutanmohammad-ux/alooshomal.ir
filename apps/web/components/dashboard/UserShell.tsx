'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BadgeCheck,
  Bookmark,
  Crown,
  IdCard,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  ImagePlus,
  Newspaper,
  ShieldCheck,
  TrendingUp,
  UserRound,
} from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/utils';
import { APP_VERSION } from '@/lib/version';

const NAV = [
  { href: '/dashboard', label: 'داشبورد', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/business-cards', label: 'کارت‌های ویزیت من', icon: BadgeCheck, exact: false },
  { href: '/dashboard/biolinks', label: 'بیولینک‌های من', icon: IdCard, exact: false },
  { href: '/dashboard/feeds', label: 'پست‌های من', icon: ImagePlus, exact: false },
  { href: '/dashboard/saved', label: 'ذخیره‌شده‌های من', icon: Bookmark, exact: false },
  { href: '/dashboard/subscriptions', label: 'اشتراک', icon: Crown, exact: false },
  { href: '/dashboard/boost', label: 'افزایش بازدید و تبلیغات', icon: TrendingUp, exact: false },
  { href: '/dashboard/reporter', label: 'شهروند خبرنگار', icon: Newspaper, exact: false },
  { href: '/dashboard/tickets', label: 'تیکت‌های پشتیبانی', icon: LifeBuoy, exact: false },
  { href: '/dashboard/profile', label: 'پروفایل کاربری', icon: UserRound, exact: false },
] as const;

export function UserShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clear } = useAuth();
  const [open, setOpen] = useState(false);

  // A limited «کاربر ادمین» has no dashboard — only the content-review panel.
  useEffect(() => {
    if (user?.role === 'MODERATOR') {
      router.replace('/moderator');
    }
  }, [user, router]);

  function logout() {
    // Best-effort server-side revoke; never block the UI on it.
    void api.post('/auth/logout').catch(() => undefined);
    clear();
    router.push('/login');
  }

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-screen">
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-56 flex-col border-l-2 border-dashed border-[var(--vintage-accent-hover)] bg-[var(--vintage-surface)] p-4 transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex-1 overflow-y-auto">
        <Link href="/" className="flex items-center gap-3 px-2 pb-5">
          <span className="vintage-avatar flex size-11 items-center justify-center">
            <IdCard className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-extrabold text-ink">شمالی کارت</p>
            <p className="text-[11px] text-muted">پنل کاربری</p>
          </div>
        </Link>

        <p className="px-3 pb-2 text-[10px] font-bold tracking-wider text-muted">
          منوی اصلی
        </p>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              // The dashboard sidebar links to every panel; letting Next prefetch
              // all of them fired a burst of `?_rsc=` requests on every page load
              // (the top network bottleneck in the speed report). Navigate on demand.
              prefetch={false}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-semibold transition',
                isActive(item.href, item.exact)
                  ? 'border-brand bg-brand-light text-brand'
                  : 'border-transparent text-muted hover:border-[var(--vintage-border)] hover:bg-[var(--vintage-paper)]',
              )}
            >
              <item.icon className="size-4" aria-hidden />
              {item.label}
            </Link>
          ))}

          {user?.role === 'ADMIN' ? (
            <Link
              href="/admin"
              prefetch={false}
              className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm font-semibold text-muted transition hover:border-[var(--vintage-border)] hover:bg-[var(--vintage-paper)]"
            >
              <ShieldCheck className="size-4" aria-hidden />
              پنل مدیر
            </Link>
          ) : null}

          {user?.role === 'MODERATOR' ? (
            <Link
              href="/moderator"
              prefetch={false}
              className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm font-semibold text-muted transition hover:border-[var(--vintage-border)] hover:bg-[var(--vintage-paper)]"
            >
              <ShieldCheck className="size-4" aria-hidden />
              پنل بررسی محتوا
            </Link>
          ) : null}

          <button
            onClick={logout}
            className="mt-3 flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-50"
          >
            <LogOut className="size-4" aria-hidden />
            خروج
          </button>
        </nav>
        </div>

        <div className="mt-4 border-t border-dashed border-[var(--vintage-border)] pt-3 text-center">
          <p className="text-[10px] text-muted">
            نسخه <span dir="ltr" className="font-bold">{APP_VERSION}</span>
          </p>
        </div>
      </aside>

      {open ? (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className="lg:mr-56">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b-2 border-dashed border-[var(--vintage-accent-hover)] bg-[var(--vintage-surface)]/95 px-4 py-3 backdrop-blur">
          <button
            onClick={() => setOpen((value) => !value)}
            className="flex size-10 items-center justify-center rounded-lg border border-[var(--vintage-border)] lg:hidden"
            aria-label="منو"
          >
            <Menu className="size-5" aria-hidden />
          </button>

          <label className="flex flex-1 items-center gap-2 rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-paper)] px-3 py-2">
            <span className="text-muted">⌕</span>
            <input
              className="w-full bg-transparent text-sm outline-none"
              placeholder="جستجو در داشبورد..."
            />
          </label>

          <Link
            href="/biolinks"
            className="hidden rounded-lg border border-[var(--vintage-border)] px-3 py-2 text-sm font-bold text-brand sm:block"
          >
            دایرکتوری
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell scope="user" />
            <div className="hidden text-left sm:block">
              <p className="text-sm font-extrabold text-ink">
                {user?.fullName ?? 'کاربر'}
              </p>
              <p className="text-[11px] text-muted">
                {user?.role === 'ADMIN'
                  ? 'مدیر'
                  : user?.role === 'MODERATOR'
                    ? 'کاربر ادمین'
                    : 'کاربر'}
              </p>
            </div>
            <span className="vintage-avatar flex size-10 items-center justify-center">
              {(user?.fullName ?? 'ک').trim().slice(0, 1)}
            </span>
          </div>
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
