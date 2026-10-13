'use client';

import { useRef } from 'react';

import { cn } from '@/lib/utils';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** render as a paragraph and allow line breaks */
  multiline?: boolean;
  className?: string;
  dir?: 'rtl' | 'ltr' | 'auto';
  ariaLabel?: string;
}

function normalize(raw: string): string {
  return raw
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}

/**
 * Minimal inline (contentEditable) text field used to edit card fields
 * directly on top of the live preview. The value is committed on blur so the
 * caret never jumps while typing; an empty element shows its placeholder via
 * the `:empty::before` rule in `globals.css`.
 */
export function InlineEdit({
  value,
  onChange,
  placeholder,
  multiline,
  className,
  dir,
  ariaLabel,
}: Props) {
  const ref = useRef<HTMLElement>(null);

  function commit() {
    const el = ref.current;
    if (!el) return;
    const next = normalize(el.innerText ?? '');
    if (el.innerText !== next) el.innerText = next;
    if (next !== value) onChange(next);
  }

  const shared = {
    contentEditable: true,
    suppressContentEditableWarning: true,
    role: 'textbox' as const,
    'aria-label': ariaLabel,
    dir,
    'data-placeholder': placeholder,
    onBlur: commit,
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      if (!multiline && event.key === 'Enter') {
        event.preventDefault();
        (event.target as HTMLElement).blur();
      }
    },
    className: cn('inline-edit', className),
  };

  if (multiline) {
    return (
      <p ref={ref as React.RefObject<HTMLParagraphElement>} {...shared}>
        {value}
      </p>
    );
  }
  return (
    <span ref={ref as React.RefObject<HTMLSpanElement>} {...shared}>
      {value}
    </span>
  );
}
