'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/lib/auth';

/**
 * Reacts to the global `alooshomal:session-expired` event fired by the API
 * client when a refresh attempt fails. Clears the cached session and sends the
 * user to the login page with a `next` back to where they were.
 */
export function SessionWatcher() {
  const router = useRouter();
  const clear = useAuth((state) => state.clear);

  useEffect(() => {
    function onExpired() {
      const path = window.location.pathname + window.location.search;
      clear();
      if (!path.startsWith('/login')) {
        router.replace(`/login?next=${encodeURIComponent(path)}`);
      }
    }
    window.addEventListener('alooshomal:session-expired', onExpired);
    return () => window.removeEventListener('alooshomal:session-expired', onExpired);
  }, [clear, router]);

  return null;
}
