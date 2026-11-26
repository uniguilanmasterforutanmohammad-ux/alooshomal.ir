'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Bell,
  Bookmark,
  Building2,
  Coins,
  Crown,
  Headset,
  IdCard,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  ImagePlus,
  Newspaper,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  UserRound,
  Wallet,
} from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { useCart } from '@/lib/cart';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { WorkspaceSwitcher } from '@/components/dashboard/WorkspaceSwitcher';
import { useFeatures } from '@/lib/features';
import { useProfileStatus } from '@/lib/profile-status';
import { cn } from '@/lib/utils';
import { APP_VERSION } from '@/lib/version';

/**
 * Dashboard sidebar. An item may carry a `feature` key: when that feature is
 * not visible (disabled or hidden by the admin) the entry is dropped, so the
 * admin's «عدم نمایش» switch also cleans up the user panel navigation.
 */
interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact: boolean;
  feature?: string;
}

interface NavGroup {
  title: string;
  /** Only shown once the user owns a real (non-placeholder) business. */
  businessOnly?: boolean;
  items: NavItem[];
}

/** The single most-used entry, kept above the groups. */
const NAV_PRIMARY: NavItem = {
  href: '/dashboard',
  label: 'داشبورد',
  icon: LayoutDashboard,
  exact: true,
};

/**
 * Grouped navigation: «حساب من» is the customer area every account gets, and
 * «کسب‌وکار من» is unlocked only after the user creates a real workspace via
 * «شروع آسان». New accounts therefore start with the limited customer panel.
 */
const NAV_GROUPS: NavGroup[] = [
  {
    title: 'حساب من',
    items: [
      { href: '/dashboard/wallet', label: 'کیف پول', icon: Wallet, exact: false, feature: 'featureWallet' },
      { href: '/dashboard/cart', label: 'سبد خرید', icon: ShoppingCart, exact: false, feature: 'featureRetailCart' },
      { href: '/dashboard/payments', label: 'سوابق خرید', icon: Receipt, exact: false, feature: 'featureRetailCart' },
      { href: '/dashboard/tickets', label: 'تیکت‌های پشتیبانی', icon: LifeBuoy, exact: false },
      { href: '/dashboard/support', label: 'پشتیبانی آنلاین', icon: Headset, exact: false },
      { href: '/dashboard/profile', label: 'پروفایل کاربری', icon: UserRound, exact: false },
      { href: '/dashboard/saved', label: 'ذخیره‌شده‌های من', icon: Bookmark, exact: false },
      { href: '/dashboard/notifications', label: 'اعلان‌ها', icon: Bell, exact: false },
    ],
  },
  {
    title: 'کسب‌وکار من',
    businessOnly: true,
    items: [
      { href: '/dashboard/business', label: 'مدیریت کسب‌وکار', icon: Building2, exact: false, feature: 'featureBusinessWorkspace' },
      { href: '/dashboard/onboarding', label: 'شروع آسان', icon: Sparkles, exact: false, feature: 'featureOnboarding' },
      // کارت ویزیت و بیولینک دیگر اینجا به‌صورت مجزا نیستند؛ تب‌های همان
      // «پنل کسب‌وکار» آن‌ها را نشان می‌دهند (مسیر قدیمی همچنان کار می‌کند).
      { href: '/dashboard/feeds', label: 'پست‌های من', icon: ImagePlus, exact: false, feature: 'featureFeedPosts' },
      { href: '/dashboard/subscriptions', label: 'اشتراک من', icon: Crown, exact: false },
      { href: '/dashboard/business/payments', label: 'پرداخت‌ها و فاکتورها', icon: Receipt, exact: false, feature: 'featureMyPayments' },
      { href: '/dashboard/inquiries', label: 'استعلام و خدمات', icon: ShieldCheck, exact: false, feature: 'featureZohalInquiries' },
      { href: '/dashboard/boost', label: 'افزایش بازدید و تبلیغات', icon: TrendingUp, exact: false, feature: 'featureBoostRequests' },
      { href: '/dashboard/points', label: 'امتیاز من', icon: Coins, exact: false, feature: 'featureNews' },
      { href: '/dashboard/reporter', label: 'شهروند خبرنگار', icon: Newspaper, exact: false, feature: 'featureNews' },
    ],
  },
];

function SidebarLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={item.href}
      // The dashboard sidebar links to every panel; letting Next prefetch all of
      // them fired a burst of `?_rsc=` requests on every page load (the top
      // network bottleneck in the speed report). Navigate on demand.
      prefetch={false}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-semibold transition',
        active
          ? 'border-brand bg-brand-light text-brand'
          : 'border-transparent text-muted hover:border-[var(--vintage-border)] hover:bg-[var(--vintage-paper)]',
      )}
    >
      <item.icon className="size-4" aria-hidden />
      {item.label}
    </Link>
  );
}

export function UserShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clear } = useAuth();
  const { isFeatureVisible } = useFeatures();
  const { count: cartCount } = useCart();
  const isRegularUser =
    user?.role === 'USER' || user?.role === 'CITIZEN_REPORTER';
  const businessVisible = isFeatureVisible('featureBusinessWorkspace');
  const onboardingVisible = isFeatureVisible('featureOnboarding');
  const { workspace } = useBusinessWorkspace(
    Boolean(user) && businessVisible,
  );
  // Only a real (non-placeholder) workspace unlocks the business panel entry;
  // brand-new users land on the normal user panel and start from there.
  const hasBusiness = Boolean(workspace && !workspace.isPlaceholder);
  const { status: profileStatus } = useProfileStatus(isRegularUser);
  const onboardingFinished = profileStatus?.onboardingFinished === true;
  const [open, setOpen] = useState(false);
  const isVisible = (item: NavItem) =>
    (!item.feature || isFeatureVisible(item.feature)) &&
    !(item.href === '/dashboard/onboarding' && onboardingFinished);
  const groups = NAV_GROUPS.filter(
    (group) => !group.businessOnly || hasBusiness,
  )
    .map((group) => ({
      title: group.title,
      items: group.items.filter(isVisible),
    }))
    .filter((group) => group.items.length > 0);

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

        <nav className="flex flex-col gap-1">
          <SidebarLink
            item={NAV_PRIMARY}
            active={isActive(NAV_PRIMARY.href, NAV_PRIMARY.exact)}
            onNavigate={() => setOpen(false)}
          />
          {groups.map((group) => (
            <div key={group.title} className="flex flex-col gap-1">
              <p className="px-3 pb-1 pt-3 text-[10px] font-bold tracking-wider text-muted">
                {group.title}
              </p>
              {group.items.map((item) => (
                <SidebarLink
                  key={item.href}
                  item={item}
                  active={isActive(item.href, item.exact)}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </div>
          ))}

          {!hasBusiness && businessVisible && onboardingVisible ? (
            <Link
              href="/dashboard/onboarding"
              prefetch={false}
              onClick={() => setOpen(false)}
              className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-brand bg-brand-light px-3 py-2.5 text-sm font-extrabold text-brand transition hover:bg-brand hover:text-white"
            >
              <Building2 className="size-4" aria-hidden />
              ایجاد کسب‌وکار
            </Link>
          ) : null}

          {user?.role === 'ADMIN' ? (
            <Link
              href="/jga4rm8j"
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
        <header className="sticky top-[var(--feature-notice-h)] z-30 flex items-center gap-3 border-b-2 border-dashed border-[var(--vintage-accent-hover)] bg-[var(--vintage-surface)]/95 px-4 py-3 backdrop-blur">
          <button
            onClick={() => setOpen((value) => !value)}
            className="flex size-10 items-center justify-center rounded-lg border border-[var(--vintage-border)] lg:hidden"
            aria-label="منو"
          >
            <Menu className="size-5" aria-hidden />
          </button>

          {/* Spacer: pushes the actions to the far end of the header. */}
          <div className="flex-1" />

          <Link
            href="/"
            className="hidden rounded-lg border border-[var(--vintage-border)] px-3 py-2 text-sm font-bold text-brand sm:block"
          >
            صفحه اصلی
          </Link>

          <div className="flex items-center gap-2">
            <WorkspaceSwitcher />
            {isFeatureVisible('featureWallet') ? (
              <Link
                href="/dashboard/wallet"
                prefetch={false}
                aria-label="کیف پول"
                title="کیف پول"
                className="flex size-9 items-center justify-center rounded-lg border border-[var(--vintage-border)] text-muted transition hover:bg-soft hover:text-brand"
              >
                <Wallet className="size-4" aria-hidden />
              </Link>
            ) : null}
            {isFeatureVisible('featureRetailCart') ? (
              <Link
                href="/dashboard/cart"
                prefetch={false}
                aria-label="سبد خرید"
                title="سبد خرید"
                className="relative flex size-9 items-center justify-center rounded-lg border border-[var(--vintage-border)] text-muted transition hover:bg-soft hover:text-brand"
              >
                <ShoppingCart className="size-4" aria-hidden />
                {cartCount > 0 ? (
                  <span className="absolute -top-1.5 -end-1.5 flex min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold leading-4 text-white">
                    {cartCount.toLocaleString('fa-IR')}
                  </span>
                ) : null}
              </Link>
            ) : null}
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
