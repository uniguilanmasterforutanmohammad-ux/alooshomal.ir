'use client';

import { Check } from 'lucide-react';

import { SPECTRUM_COLORS } from '@/lib/card-spectrum';
import { cn } from '@/lib/utils';

interface Props {
  /** Currently selected background colour (`#rrggbb`). */
  value: string;
  onChange: (color: string) => void;
  /** Optional label override. */
  label?: string;
}

/**
 * The 14-colour «طیفی» palette from the reference files. The builder picks one
 * swatch and the chosen colour is stored on the card / biolink as
 * `primaryColor`, so the same picker drives both builders.
 */
export function SpectrumColorPicker({ value, onChange, label }: Props) {
  const selected = value.trim().toLowerCase();
  return (
    <div>
      <span className="text-sm font-bold text-ink">{label ?? 'رنگ طیفی'}</span>
      <div className="mt-2 grid grid-cols-7 gap-2">
        {SPECTRUM_COLORS.map((color) => {
          const active = color.bg.toLowerCase() === selected;
          return (
            <button
              key={color.bg}
              type="button"
              onClick={() => onChange(color.bg)}
              title={color.name}
              aria-label={color.name}
              aria-pressed={active}
              className={cn(
                'relative flex aspect-square items-center justify-center rounded-lg border-2 transition',
                active
                  ? 'border-brand ring-2 ring-brand/30'
                  : 'border-[var(--vintage-border)] hover:scale-105',
              )}
              style={{ background: color.bg, color: color.fg }}
            >
              {active ? <Check className="size-4" aria-hidden /> : null}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">
        رنگ انتخاب‌شده روی پیش‌نمایش و صفحه‌ی عمومی اعمال می‌شود.
      </p>
    </div>
  );
}
