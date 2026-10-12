'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { NotificationsInbox } from '@/components/ui/NotificationsInbox';
import { ReporterCtaButton } from '@/components/news/ReporterCtaButton';
import { useAuth } from '@/lib/auth';

export default function NotificationsPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login');
    }
  }, [hydrated, token, router]);

  return (
    <div className="flex flex-col gap-4">
      <ReporterCtaButton variant="secondary" className="self-start py-2 text-sm" />
      <NotificationsInbox scope="user" />
    </div>
  );
}
