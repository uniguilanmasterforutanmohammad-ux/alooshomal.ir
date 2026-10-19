'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';

import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

interface Props {
  /** absolute or relative URL to share; defaults to the current page URL */
  url?: string;
  title?: string;
  /** compact pill used inside directory rows; large pill for public pages */
  size?: 'sm' | 'md';
  /** render as a plain icon-only button (public pages) */
  iconOnly?: boolean;
  className?: string;
}

/**
 * «اشتراک‌گذاری» — shares the current page via the native Web Share sheet when
 * available (mobile), and otherwise copies the link to the clipboard and shows
 * a confirmation toast. Always rendered as an icon-only button on the public
 * record pages, next to the like / save actions.
 */
export function ShareButton({ url, title, size = 'sm', iconOnly, className }: Props) {
  const [busy, setBusy] = useState(false);

  async function share(event: React.MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    if (busy) return;
    const target =
      url ?? (typeof window !== 'undefined' ? window.location.href : '');
    const shareTitle = title ?? (typeof document !== 'undefined' ? document.title : '');
    setBusy(true);
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: shareTitle, url: target });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(target);
        toast.success('لینک کپی شد؛ می‌توانید آن را به اشتراک بگذارید.', 'اشتراک‌گذاری');
        return;
      }
      toast.info(target, 'لینک اشتراک‌گذاری');
    } catch {
      /* user cancelled the share sheet — nothing to report */
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      disabled={busy}
      aria-label="اشتراک‌گذاری"
      title="اشتراک‌گذاری"
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-full border font-bold transition',
        iconOnly
          ? size === 'sm'
            ? 'size-8'
            : 'size-10'
          : size === 'sm'
            ? 'px-2.5 py-1 text-xs'
            : 'px-4 py-2 text-sm',
        'border-[var(--vintage-border)] text-muted hover:border-brand hover:text-brand',
        busy && 'opacity-70',
        className,
      )}
    >
      <Share2 className={cn(size === 'sm' ? 'size-3.5' : 'size-4')} aria-hidden />
      {iconOnly ? null : <span>اشتراک‌گذاری</span>}
    </button>
  );
}
