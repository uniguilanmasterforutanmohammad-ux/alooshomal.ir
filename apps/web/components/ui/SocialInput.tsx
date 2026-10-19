'use client';

import { SOCIAL_FIELDS, socialInputToValue, socialValueToInput } from '@/lib/social-fields';

interface Props {
  /** one of the social field keys */
  field: 'whatsapp' | 'linkedin' | 'instagram' | 'telegram' | 'twitter';
  /** the stored value (may be a full URL); only the username is shown */
  value: string;
  onChange: (value: string) => void;
}

/**
 * Social-network input with a fixed, non-editable base (e.g. `instagram.com/`)
 * followed by a single box where the user types only their username / id. The
 * full URL is stored in the form value, so previews and submissions stay
 * unchanged, while existing full URLs open with just the username shown.
 */
export function SocialInput({ field, value, onChange }: Props) {
  const spec = SOCIAL_FIELDS.find((entry) => entry.key === field);
  if (!spec) return null;

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-bold text-ink">{spec.label}</span>
      <span className="flex items-stretch overflow-hidden rounded-[var(--vintage-radius)] border border-[var(--vintage-border)] bg-[#fffaf2] transition focus-within:border-brand focus-within:shadow-[0_0_0_3px_rgba(139,58,26,0.15)]">
        <span
          dir="ltr"
          className="flex select-none items-center whitespace-nowrap border-e border-[var(--vintage-border)] bg-[var(--vintage-paper)] px-2.5 text-xs font-bold text-muted"
        >
          {spec.prefix}
        </span>
        <input
          dir="ltr"
          inputMode={spec.kind === 'phone' ? 'tel' : 'text'}
          value={socialValueToInput(spec.key, value)}
          placeholder={spec.placeholder}
          onChange={(event) => onChange(socialInputToValue(spec.key, event.target.value))}
          className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-ink outline-none placeholder:text-[#9c8264]"
        />
      </span>
    </label>
  );
}
