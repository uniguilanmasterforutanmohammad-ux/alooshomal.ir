'use client';

import { Moon, Sun } from 'lucide-react';

import {
  BIOLINK_TEMPLATES,
  type BiolinkTemplate,
} from '@/lib/biolink-templates';

interface Props {
  /** the owner's light-mode template key */
  light: string;
  /** the owner's dark-mode template key */
  dark: string;
  /** admin-enabled template keys (falls back to all when empty) */
  enabledKeys?: string[];
  onLight: (key: string) => void;
  onDark: (key: string) => void;
}

/**
 * «حالت نمایش» picker: the owner chooses a display template for light-mode and
 * one for dark-mode pages. Only the admin-enabled templates are offered; when
 * the admin has disabled some, the others are dropped from the grid.
 */
export function BiolinkTemplatePicker({
  light,
  dark,
  enabledKeys,
  onLight,
  onDark,
}: Props) {
  const set = new Set(enabledKeys ?? []);
  const available: BiolinkTemplate[] =
    set.size > 0 ? BIOLINK_TEMPLATES.filter((t) => set.has(t.key)) : BIOLINK_TEMPLATES;

  const groups: Array<{
    key: 'light' | 'dark';
    label: string;
    Icon: typeof Sun;
    value: string;
    onPick: (key: string) => void;
  }> = [
    { key: 'light', label: 'تم روشن', Icon: Sun, value: light, onPick: onLight },
    { key: 'dark', label: 'تم تاریک', Icon: Moon, value: dark, onPick: onDark },
  ];

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.key}>
          <p className="flex items-center gap-1.5 text-xs font-bold text-muted">
            <group.Icon className="size-3.5" aria-hidden />
            {group.label}
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {available.map((template) => (
              <button
                key={template.key}
                type="button"
                onClick={() => group.onPick(template.key)}
                title={template.name}
                aria-pressed={group.value === template.key}
                className={
                  group.value === template.key
                    ? 'rounded-lg border-2 border-brand p-1.5'
                    : 'rounded-lg border-2 border-transparent p-1.5 hover:border-[var(--vintage-border)]'
                }
              >
                <span
                  className="block h-8 w-full rounded-md border border-[var(--vintage-border)]"
                  style={{
                    background: `linear-gradient(135deg, ${template.swatch[0]} 0 34%, ${template.swatch[1]} 34% 67%, ${template.swatch[2]} 67% 100%)`,
                  }}
                />
                <span className="mt-1 block truncate text-[10px] text-muted">
                  {template.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
