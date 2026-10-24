'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

import { NotificationsInbox } from '@/components/ui/NotificationsInbox';
import { useAuth } from '@/lib/auth';
import { moderatorNotificationLink } from '@/lib/moderator-links';

export default function ModeratorNotificationsPage() {
  const router = useRouter();
  const { token, user, hydrated } = useAuth();

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace('/login?next=/moderator/notifications');
      return;
    }
    if (user && user.role !== 'MODERATOR' && user.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [hydrated, token, user, router]);

  return (
    <div className="min-h-screen bg-[#fbf3e9]">
      <header className="sticky top-[var(--feature-notice-h)] z-30 border-b-2 border-dashed border-[var(--vintage-accent-hover)] bg-[#fbf3e9]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <Link
            href="/moderator"
            className="flex size-10 items-center justify-center rounded-lg border border-[var(--vintage-border)] bg-white text-ink"
            aria-label="بازگشت به پنل بررسی"
          >
            <ChevronRight className="size-5" aria-hidden />
          </Link>
          <p className="text-sm font-extrabold text-ink">اعلانات بررسی</p>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-4">
        <Suspense
          fallback={<p className="py-8 text-center text-sm text-muted">در حال بارگذاری...</p>}
        >
          <NotificationsInbox scope="admin" linkMapper={moderatorNotificationLink} />
        </Suspense>
      </main>
    </div>
  );
}
