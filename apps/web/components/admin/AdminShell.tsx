'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Activity,
  Banknote,
  BarChart3,
  BookOpen,
  Coins,
  Crown,
  CreditCard,
  HardDrive,
  IdCard,
  LifeBuoy,
  LayoutDashboard,
  LogOut,
  Mail,
  Megaphone,
  ImagePlus,
  Menu,
  Bell,
  Newspaper,
  FlaskConical,
  Receipt,
  Settings,
  Share2,
  ShieldCheck,
  TrendingUp,
  UserCog,
  Users,
} from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/utils';

export type AdminSection =
  | 'overview'
  | 'biolinks'
  | 'business-cards'
  | 'subscriptions'
  | 'boosts'
  | 'ads'
  | 'points'
  | 'revenue'
  | 'finance'
  | 'zohal'
  | 'payments'
  | 'payping-oauth'
  | 'feeds'
  | 'users'
  | 'emails'
  | 'tickets'
  | 'reports'
  | 'tools'
  | 'news'
  | 'blog'
  | 'permissions'
  | 'moderators'
  | 'social-accounts'
  | 'storage'
  | 'monitoring'
  | 'notifications'
  | 'settings';

interface Props {
  section: AdminSection;
  onSection: (section: AdminSection) => void;
  children: React.ReactNode;
}

/** The single most-used entry, kept above the groups. */
const NAV_PRIMARY: { key: AdminSection; label: string; icon: typeof LayoutDashboard } = {
  key: 'overview',
  label: 'داشبورد',
  icon: LayoutDashboard,
};

/**
 * Sidebar information architecture: related panels live under one heading so a
 * flat list of 24 items stays scannable. Order matches the daily workflow —
 * review first, then revenue, people, and finally system settings.
 */
const NAV_GROUPS: Array<{
  title: string;
  items: Array<{ key: AdminSection; label: string; icon: typeof LayoutDashboard }>;
}> = [
  {
    title: 'بررسی محتوا',
    items: [
      { key: 'biolinks', label: 'بیولینک‌ها', icon: IdCard },
      { key: 'business-cards', label: 'کارت‌های ویزیت', icon: IdCard },
      { key: 'feeds', label: 'فیدها', icon: ImagePlus },
      { key: 'news', label: 'شهروند خبرنگار', icon: Newspaper },
      { key: 'blog', label: 'بلاگ', icon: BookOpen },
    ],
  },
  {
    title: 'درآمد و پرداخت',
    items: [
      { key: 'subscriptions', label: 'اشتراک‌ها', icon: Crown },
      { key: 'boosts', label: 'افزایش بازدید', icon: TrendingUp },
      { key: 'ads', label: 'تبلیغات', icon: Megaphone },
      { key: 'points', label: 'امتیازها', icon: Coins },
      { key: 'revenue', label: 'گزارش درآمد', icon: Banknote },
      { key: 'finance', label: 'مالیاتی', icon: Receipt },
      { key: 'zohal', label: 'زحل (استعلام)', icon: ShieldCheck },
      { key: 'payments', label: 'درگاه پرداخت', icon: CreditCard },
      { key: 'payping-oauth', label: 'درگاه پرداخت (OAuth)', icon: ShieldCheck },
    ],
  },
  {
    title: 'کاربران و پشتیبانی',
    items: [
      { key: 'users', label: 'کاربران', icon: Users },
      { key: 'tickets', label: 'تیکت‌ها', icon: LifeBuoy },
      { key: 'emails', label: 'ایمیل‌های ارسالی', icon: Mail },
      { key: 'notifications', label: 'اعلانات', icon: Bell },
      { key: 'moderators', label: 'کاربران ادمین', icon: UserCog },
      { key: 'permissions', label: 'سطوح دسترسی', icon: ShieldCheck },
    ],
  },
  {
    title: 'تنظیمات و سیستم',
    items: [
      { key: 'settings', label: 'تنظیمات', icon: Settings },
      { key: 'social-accounts', label: 'شبکه‌های اجتماعی', icon: Share2 },
      { key: 'monitoring', label: 'پایش منابع', icon: Activity },
      { key: 'storage', label: 'فضای سرور', icon: HardDrive },
      { key: 'reports', label: 'گزارش‌های سیستم', icon: BarChart3 },
      { key: 'tools', label: 'ابزار تست', icon: FlaskConical },
    ],
  },
];

function NavButton({
  item,
  active,
  onSelect,
}: {
  item: { key: AdminSection; label: string; icon: typeof LayoutDashboard };
  active: boolean;
  onSelect: (key: AdminSection) => void;
}) {
  return (
    <button
      onClick={() => onSelect(item.key)}
      className={cn(
        'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-semibold transition',
        active
          ? 'border-brand bg-brand-light text-brand'
          : 'border-transparent text-muted hover:border-[var(--vintage-border)] hover:bg-[var(--indeed-blue-light)]',
      )}
    >
      <item.icon className="size-4" aria-hidden />
      {item.label}
    </button>
  );
}

export function AdminShell({ section, onSection, children }: Props) {
  const router = useRouter();
  const { user, clear } = useAuth();
  const [open, setOpen] = useState(false);

  function logout() {
    // Best-effort server-side revoke; never block the UI on it.
    void api.post('/auth/logout').catch(() => undefined);
    clear();
    router.push('/admin/login');
  }

  return (
    <div className="min-h-screen">
      {/* sidebar — fixed on the right for RTL */}
      <aside
        className={cn(
          'admin-sidebar fixed inset-y-0 right-0 z-50 w-56 overflow-y-auto overscroll-contain border-l-2 border-dashed border-[var(--vintage-accent-hover)] bg-[var(--vintage-surface)] p-4 pb-6 transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex items-center gap-3 px-2 pb-5">
          <span className="vintage-avatar flex size-11 items-center justify-center">
            <IdCard className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-extrabold text-ink">شمالی کارت</p>
            <p className="text-[11px] text-muted">داشبورد مدیریت</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          <NavButton
            item={NAV_PRIMARY}
            active={section === NAV_PRIMARY.key}
            onSelect={(key) => {
              onSection(key);
              setOpen(false);
            }}
          />
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-1">
              <p className="px-3 pb-1 pt-3 text-[10px] font-bold tracking-wider text-muted">
                {group.title}
              </p>
              {group.items.map((item) => (
                <NavButton
                  key={item.key}
                  item={item}
                  active={section === item.key}
                  onSelect={(key) => {
                    onSection(key);
                    setOpen(false);
                  }}
                />
              ))}
            </div>
          ))}
          <button
            onClick={logout}
            className="mt-3 flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-50"
          >
            <LogOut className="size-4" aria-hidden />
            خروج
          </button>
        </nav>
      </aside>

      {open ? (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className="lg:mr-56">
        <header className="sticky top-[var(--feature-notice-h)] z-30 flex items-center gap-3 border-b-2 border-dashed border-[var(--vintage-accent-hover)] bg-[color-mix(in_srgb,var(--vintage-surface)_95%,transparent)] px-4 py-3 backdrop-blur">
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
            مشاهده سایت
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell scope="admin" />
            <div className="hidden text-left sm:block">
              <p className="text-sm font-extrabold text-ink">{user?.fullName ?? 'مدیر'}</p>
              <p className="text-[11px] text-muted">مدیر کل</p>
            </div>
            <span className="vintage-avatar flex size-10 items-center justify-center">
              {(user?.fullName ?? 'م').trim().slice(0, 1)}
            </span>
          </div>
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
