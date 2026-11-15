'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import { syncThemeMode } from '@/lib/theme';

/**
 * Keeps the document in sync with the stored light/dark preference.
 *
 * `ThemeScript` applies it before the first paint; this component re-applies it
 * after client-side navigations and when the tab becomes visible, and follows
 * changes made in another tab.
 */
export function ThemeSync() {
  const pathname = usePathname();

  useEffect(() => {
    syncThemeMode();
  }, [pathname]);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === 'theme') syncThemeMode();
    }
    function onVisible() {
      if (!document.hidden) syncThemeMode();
    }
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return null;
}
