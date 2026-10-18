'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IdCard, LogOut, ShieldCheck } from 'lucide-react';

import { NotificationBell } from '@/components/ui/NotificationBell';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { moderatorNotificationLink } from '@/lib/moderator-links';
import { cn } from '@/lib/utils';
import { APP_VERSION } from '@/lib/version';

export interface ModeratorScopeTab {
  scope: string;
  label: string;
  pending?: number;
}

interface Props {
  tabs: ModeratorScopeTab[];
  active: string;
  onTab: (scope: string) => void;
  children: React.ReactNode;
}

/**
 * Mobile/tablet-first shell for the limited «کاربر ادمین» review panel. A top
 * bar with the reviewer identity, a horizontally scrollable scope switcher
 * (thumb-friendly), and a bottom "خروج" action. Intentionally minimal — no
 * sidebar, settings, or admin navigation is exposed.
 */
export function ModeratorShell({ tabs, active, onTab, children }: Props) {
  const router = useRouter();
  const { user, clear } = useAuth();

  function logout() {
    void api.post('/auth/logout').catch(() => undefined);
    clear();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-[#fbf3e9]">
      <header className="sticky top-0 z-30 border-b-2 border-dashed border-[var(--vintage-accent-hover)] bg-[#fbf3e9]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <span className="vintage-avatar flex size-11 items-center justify-center">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-ink">
              {user?.fullName ?? 'کاربر ادمین'}
            </p>
            <p className="text-[11px] text-muted">پنل بررسی محتوا</p>
          </div>
          <NotificationBell
            scope="admin"
            allPath="/moderator/notifications"
            linkMapper={moderatorNotificationLink}
          />
          <button
            onClick={logout}
            className="flex size-10 items-center justify-center rounded-lg border border-[var(--vintage-border)] bg-white text-red-600"
            aria-label="خروج"
          >
            <LogOut className="size-4" aria-hidden />
          </button>
        </div>

        <div className="mx-auto mt-3 flex max-w-3xl gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.scope}
              onClick={() => onTab(tab.scope)}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold transition',
                active === tab.scope
                  ? 'border-brand bg-brand-light text-brand'
                  : 'border-[var(--vintage-border)] bg-white text-muted',
              )}
            >
              {tab.label}
              {tab.pending ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold text-amber-700">
                  {tab.pending.toLocaleString('fa-IR')}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4">{children}</main>

      <footer className="mx-auto flex max-w-3xl items-center justify-between px-4 pb-6 pt-2 text-[11px] text-muted">
        <Link href="/" className="font-bold hover:underline">
          <IdCard className="me-1 inline size-3" aria-hidden />
          مشاهده سایت
        </Link>
        <span dir="ltr" className="font-bold">
          {APP_VERSION}
        </span>
      </footer>
    </div>
  );
}
