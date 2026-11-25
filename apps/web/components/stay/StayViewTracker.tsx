'use client';

import { useEffect } from 'react';

import { api } from '@/lib/api';

/**
 * Fire-and-forget page-view counter for the public stay page. Guarded by
 * `sessionStorage` so a single visit (including client navigations) counts once.
 */
export function StayViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `stay-view:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // sessionStorage unavailable (private mode) — still count the view.
    }
    void api
      .post(`/public/accommodations/${encodeURIComponent(slug)}/view`, {})
      .catch(() => undefined);
  }, [slug]);

  return null;
}
