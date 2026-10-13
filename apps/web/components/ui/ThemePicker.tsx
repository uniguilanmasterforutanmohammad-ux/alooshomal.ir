'use client';

import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface ThemeOption {
  key: string;
  name: string;
  swatch: [string, string, string];
}

interface Props {
  themes: ThemeOption[];
  selected?: string | null;
  onSelect: (key: string) => void;
  /** short hint shown above the grid */
  hint?: string;
}

/**
 * Theme-first picker used by the biolink / business-card builders. The user
 * picks a look before filling anything in; each tile shows a gradient swatch
 * built from the theme colours so the choice is obvious at a glance.
 */
export function ThemePicker({ themes, selected, onSelect, hint }: Props) {
  return (
    <div className="indeed-panel p-6">
      <div className="text-center">
        <h2 className="text-lg font-extrabold text-ink">ابتدا یک تم انتخاب کنید</h2>
        <p className="mt-1 text-sm text-muted">
          {hint ??
            'کارت شما با همین تم باز می‌شود و می‌توانید همه‌ی فیلدها را مستقیم روی پیش‌نمایش ویرایش کنید.'}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {themes.map((theme) => {
          const active = selected === theme.key;
          return (
            <button
              key={theme.key}
              type="button"
              onClick={() => onSelect(theme.key)}
              title={theme.name}
              aria-pressed={active}
              className={cn(
                'group flex flex-col gap-2 rounded-xl border-2 p-2 text-right transition',
                active
                  ? 'border-brand bg-brand-light'
                  : 'border-[var(--vintage-border)] bg-white hover:border-[var(--vintage-accent-hover)]',
              )}
            >
              <span
                className="relative block h-20 w-full overflow-hidden rounded-lg border border-[var(--vintage-border)]"
                style={{
                  background: `linear-gradient(135deg, ${theme.swatch[0]} 0 34%, ${theme.swatch[1]} 34% 67%, ${theme.swatch[2]} 67% 100%)`,
                }}
              >
                {active ? (
                  <span className="absolute top-1.5 left-1.5 flex size-6 items-center justify-center rounded-full bg-brand text-white shadow">
                    <Check className="size-3.5" aria-hidden />
                  </span>
                ) : null}
              </span>
              <span className="truncate text-sm font-bold text-ink">{theme.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
