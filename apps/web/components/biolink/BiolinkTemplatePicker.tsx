'use client';

import {
  BIOLINK_TEMPLATES,
  RECORD_TEMPLATE,
  type BiolinkTemplate,
} from '@/lib/biolink-templates';

interface Props {
  /** the owner's chosen display mode (a design key, or the classic record) */
  value: string;
  /** admin-enabled design keys (falls back to all when empty) */
  enabledKeys?: string[];
  onChange: (key: string) => void;
}

/**
 * «حالت نمایش» picker. The owner picks one design for their biolink; the classic
 * «رکورد» look is always offered as the default option. Once published, the
 * visitor can switch between the classic look and the chosen design.
 */
export function BiolinkTemplatePicker({ value, enabledKeys, onChange }: Props) {
  const set = new Set(enabledKeys ?? []);
  const designs: BiolinkTemplate[] =
    set.size > 0 ? BIOLINK_TEMPLATES.filter((t) => set.has(t.key)) : BIOLINK_TEMPLATES;
  const options: BiolinkTemplate[] = [RECORD_TEMPLATE, ...designs];

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {options.map((template) => (
        <button
          key={template.key}
          type="button"
          onClick={() => onChange(template.key)}
          title={template.name}
          aria-pressed={value === template.key}
          className={
            value === template.key
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
  );
}
