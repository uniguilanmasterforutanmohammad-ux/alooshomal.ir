'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { NotificationsInbox } from '@/components/ui/NotificationsInbox';
import { useAuth } from '@/lib/auth';

export default function NotificationsPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login');
    }
  }, [hydrated, token, router]);

  return <NotificationsInbox scope="user" />;
}
