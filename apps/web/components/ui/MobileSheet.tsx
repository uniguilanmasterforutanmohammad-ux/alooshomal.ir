'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

/**
 * Mobile-only bottom sheet used by the directory pages: tapping a card opens
 * its details as a modal instead of the desktop side panel. Hidden from `md`
 * upwards, where the inline split view takes over. Locks body scroll while open.
 */
export function MobileSheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col overflow-hidden rounded-t-2xl border-t-2 border-dashed border-[var(--vintage-accent-hover)] bg-[var(--vintage-surface)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-between border-b border-dashed border-[var(--vintage-border)] px-4 py-3">
          <span className="text-sm font-extrabold text-ink">{title ?? 'جزئیات'}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="flex size-9 items-center justify-center rounded-lg border border-[var(--vintage-border)] bg-white"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
