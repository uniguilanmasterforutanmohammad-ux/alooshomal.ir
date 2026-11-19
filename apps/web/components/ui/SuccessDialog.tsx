'use client';

import { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  description?: string;
  /** Label of the primary action; the dialog closes and calls `onPrimary`. */
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Closing via the X button or the backdrop. */
  onClose: () => void;
}

/**
 * Centered confirmation popup shown after a successful create action. Locks
 * body scroll while open and closes with Escape.
 */
export function SuccessDialog({
  open,
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-dialog-title"
    >
      <div className="absolute inset-0 bg-black/45" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-sm rounded-2xl border border-[var(--vintage-border)] bg-[var(--vintage-surface)] p-5 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="بستن"
          className="absolute left-3 top-3 flex size-8 items-center justify-center rounded-lg border border-[var(--vintage-border)] bg-white text-muted transition hover:text-ink"
        >
          <X className="size-4" aria-hidden />
        </button>
        <div className="flex flex-col items-center text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-8" aria-hidden />
          </span>
          <h2
            id="success-dialog-title"
            className="mt-4 text-lg font-extrabold text-ink"
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
          ) : null}
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onPrimary}
            className="indeed-btn indeed-btn-primary w-full py-2 text-sm"
          >
            {primaryLabel}
          </button>
          {secondaryLabel && onSecondary ? (
            <button
              type="button"
              onClick={onSecondary}
              className="indeed-btn indeed-btn-secondary w-full py-2 text-sm"
            >
              {secondaryLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
