'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

import {
  applyThemeMode,
  getThemeMode,
  subscribeTheme,
} from '@/lib/theme';

export function ThemeToggle() {
  // The server snapshot is «light» (the inline ThemeScript makes the real
  // decision before paint), then hydration switches to the stored preference.
  const mode = useSyncExternalStore(
    subscribeTheme,
    getThemeMode,
    () => 'light' as const,
  );
  const dark = mode === 'dark';

  function toggle() {
    applyThemeMode(dark ? 'light' : 'dark');
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'حالت روشن' : 'حالت تیره'}
      className="inline-flex size-10 items-center justify-center rounded-full border border-line bg-soft text-ink transition hover:bg-brand-light"
    >
      {dark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
    </button>
  );
}
