'use client';

import { useEffect } from 'react';

import { api } from '@/lib/api';
import { toast } from '@/lib/toast';

/**
 * Handles the PayPing OAuth redirect. The registered redirect URI is the site
 * root, so PayPing returns here with `?code=…&state=…`. This component (mounted
 * in the root layout) exchanges the code through the API, cleans the URL and
 * sends the admin to the OAuth panel. It is a no-op on normal visits.
 */
export function PaypingOAuthCatcher() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (!code || !state) return;

    const cleanUrl = () => {
      params.delete('code');
      params.delete('state');
      params.delete('scope');
      params.delete('session_state');
      const query = params.toString();
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}${query ? `?${query}` : ''}`,
      );
    };

    void (async () => {
      try {
        await api.post('/admin/payping-oauth/callback', { code, state });
        cleanUrl();
        toast.success('اتصال به پی‌پینگ با موفقیت انجام شد.', 'پی‌پینگ');
        window.location.href = '/admin?section=payping-oauth';
      } catch (error) {
        cleanUrl();
        toast.error(
          error instanceof Error ? error.message : 'اتصال به پی‌پینگ ناموفق بود.',
          'پی‌پینگ',
        );
        window.location.href = '/admin?section=payping-oauth';
      }
    })();
  }, []);

  return null;
}
