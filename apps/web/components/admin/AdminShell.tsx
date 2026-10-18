'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Banknote,
  BarChart3,
  Coins,
  Crown,
  HardDrive,
  IdCard,
  LifeBuoy,
  LayoutDashboard,
  LogOut,
  Megaphone,
  ImagePlus,
  Menu,
  Bell,
  Newspaper,
  FlaskConical,
  Settings,
  ShieldCheck,
  TrendingUp,
  UserCog,
  Users,
} from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { NotificationBell } from '@/components/ui/NotificationBell';
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
  | 'feeds'
  | 'users'
  | 'tickets'
  | 'reports'
  | 'tools'
  | 'news'
  | 'permissions'
  | 'moderators'
  | 'storage'
  | 'notifications'
  | 'settings';

interface Props {
  section: AdminSection;
  onSection: (section: AdminSection) => void;
  children: React.ReactNode;
}

const NAV: Array<{ key: AdminSection; label: string; icon: typeof LayoutDashboard }> = [
  { key: 'overview', label: 'داشبورد', icon: LayoutDashboard },
  { key: 'biolinks', label: 'بیولینک‌ها', icon: IdCard },
  { key: 'business-cards', label: 'کارت‌های ویزیت', icon: IdCard },
  { key: 'subscriptions', label: 'اشتراک‌ها', icon: Crown },
  { key: 'boosts', label: 'افزایش بازدید', icon: TrendingUp },
  { key: 'ads', label: 'تبلیغات', icon: Megaphone },
  { key: 'revenue', label: 'درآمد', icon: Banknote },
  { key: 'points', label: 'امتیازها', icon: Coins },
  { key: 'feeds', label: 'فیدها', icon: ImagePlus },
  { key: 'users', label: 'کاربران', icon: Users },
  { key: 'tickets', label: 'تیکت‌ها', icon: LifeBuoy },
  { key: 'news', label: 'نبض شهر', icon: Newspaper },
  { key: 'permissions', label: 'سطوح دسترسی', icon: ShieldCheck },
  { key: 'moderators', label: 'کاربران ادمین', icon: UserCog },
  { key: 'storage', label: 'فضای سرور', icon: HardDrive },
  { key: 'reports', label: 'گزارش‌ها', icon: BarChart3 },
  { key: 'notifications', label: 'اعلانات', icon: Bell },
  { key: 'tools', label: 'ابزار تست', icon: FlaskConical },
  { key: 'settings', label: 'تنظیمات', icon: Settings },
];

export function AdminShell({ section, onSection, children }: Props) {
  const router = useRouter();
  const { user, clear } = useAuth();
  const [open, setOpen] = useState(false);

  function logout() {
    // Best-effort server-side revoke; never block the UI on it.
    void api.post('/auth/logout').catch(() => undefined);
    clear();
    router.push('/login');
  }

  return (
    <div className="min-h-screen">
      {/* sidebar — fixed on the right for RTL */}
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-56 border-l-2 border-dashed border-[var(--vintage-accent-hover)] bg-[#fbf3e9] p-4 transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex items-center gap-3 px-2 pb-5">
          <span className="vintage-avatar flex size-11 items-center justify-center">
            <IdCard className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-extrabold text-ink">آلوشمال</p>
            <p className="text-[11px] text-muted">داشبورد مدیریت</p>
          </div>
        </div>

        <p className="px-3 pb-2 text-[10px] font-bold tracking-wider text-muted">
          منوی اصلی
        </p>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                onSection(item.key);
                setOpen(false);
              }}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-semibold transition',
                section === item.key
                  ? 'border-brand bg-brand-light text-brand'
                  : 'border-transparent text-muted hover:border-[var(--vintage-border)] hover:bg-white',
              )}
            >
              <item.icon className="size-4" aria-hidden />
              {item.label}
            </button>
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
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b-2 border-dashed border-[var(--vintage-accent-hover)] bg-[#fbf3e9]/95 px-4 py-3 backdrop-blur">
          <button
            onClick={() => setOpen((value) => !value)}
            className="flex size-10 items-center justify-center rounded-lg border border-[var(--vintage-border)] lg:hidden"
            aria-label="منو"
          >
            <Menu className="size-5" aria-hidden />
          </button>

          <label className="flex flex-1 items-center gap-2 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2">
            <span className="text-muted">⌕</span>
            <input
              className="w-full bg-transparent text-sm outline-none"
              placeholder="جستجو در داشبورد..."
            />
          </label>

          <Link
            href="/"
            className="hidden rounded-lg border border-[var(--vintage-border)] px-3 py-2 text-sm font-bold text-brand sm:block"
          >
            مشاهده سایت
          </Link>

          <div className="flex items-center gap-2">
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
