'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ListOrdered, Megaphone } from 'lucide-react';

import { HomeAdSection } from '@/components/dashboard/HomeAdSection';
import { DirectoryAdSection } from '@/components/dashboard/DirectoryAdSection';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

type Tab = 'home' | 'directory';

const TABS: Array<{ key: Tab; label: string; icon: typeof Megaphone }> = [
  { key: 'home', label: 'تبلیغ در صفحه اصلی', icon: Megaphone },
  { key: 'directory', label: 'تبلیغ در دایرکتوری', icon: ListOrdered },
];

export default function AdsPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const [tab, setTab] = useState<Tab>('home');

  useEffect(() => {
    if (!hydrated) return;
    if (!token) router.replace('/login');
  }, [hydrated, token, router]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-extrabold text-ink">تبلیغات</h2>
        <p className="text-sm text-muted">
          تبلیغ خود را در صفحه اصلی یا در صدر دایرکتوری نمایش دهید. هر درخواست پس از
          تأیید مدیر فعال می‌شود.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold transition',
              tab === key
                ? 'border-brand bg-brand-light text-brand'
                : 'border-[var(--vintage-border)] bg-white text-muted hover:border-brand',
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {tab === 'home' ? <HomeAdSection /> : <DirectoryAdSection />}
    </div>
  );
}
