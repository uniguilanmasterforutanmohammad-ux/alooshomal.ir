'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Link2 } from 'lucide-react';

import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export interface LinkableOption {
  id: string;
  slug: string;
  fullName: string;
  status: string;
  linkedBiolinkId?: string | null;
  linkedBusinessCardId?: string | null;
  selectable: boolean;
}

interface Props {
  /** Which counterpart to offer: the other side of the link. */
  kind: 'biolink' | 'business-card';
  /** Currently selected id (`''` = no link). */
  value: string;
  onChange: (value: string) => void;
  /**
   * When editing, the id of the item being edited (the current item). The
   * option already linked to it stays selectable; options linked elsewhere are
   * disabled because the relation is one-to-one.
   */
  currentId?: string;
}

/**
 * One-to-one link picker shared by the biolink and business-card forms. Fetches
 * the signed-in user's own items of the opposite kind and lets them attach (or
 * detach) exactly one counterpart. Items already linked to another counterpart
 * are shown but disabled, so the user never picks a link that would break the
 * other side.
 */
export function LinkSelector({ kind, value, onChange, currentId }: Props) {
  const [options, setOptions] = useState<LinkableOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const isBiolink = kind === 'biolink';
  const path = isBiolink
    ? '/biolinks/linkable/business-cards'
    : '/business-cards/linkable/biolinks';
  const label = isBiolink ? 'کارت ویزیت' : 'بیولینک';
  const placeholder = isBiolink
    ? 'بدون اتصال به کارت ویزیت'
    : 'بدون اتصال به بیولینک';

  useEffect(() => {
    let active = true;
    setLoading(true);
    const query = currentId
      ? `?currentId=${encodeURIComponent(currentId)}`
      : '';
    api
      .get<LinkableOption[]>(`${path}${query}`)
      .then((rows) => {
        if (active) setOptions(rows);
      })
      .catch(() => {
        if (active) setOptions([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, currentId]);

  // Close the custom dropdown when clicking outside or pressing Escape, so the
  // control behaves like a native select but with our own readable styling.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const selected = options.find((option) => option.id === value) ?? null;

  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
        <Link2 className="size-4 text-brand" aria-hidden />
        اتصال به {label}
      </span>

      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          disabled={loading}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="indeed-input flex items-center justify-between gap-3 text-start disabled:opacity-60"
        >
          {selected ? (
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="truncate font-bold text-ink">{selected.fullName}</span>
              <span dir="ltr" className="shrink-0 text-xs text-muted">
                {selected.slug}
              </span>
            </span>
          ) : (
            <span className="text-muted">{placeholder}</span>
          )}
          <ChevronDown
            className={cn(
              'size-4 shrink-0 text-muted transition-transform',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </button>

        {open ? (
          <ul
            role="listbox"
            className="absolute inset-x-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-[var(--vintage-border)] bg-white py-1 shadow-lg"
          >
            <li>
              <button
                type="button"
                role="option"
                aria-selected={value === ''}
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-start text-sm text-muted hover:bg-soft"
              >
                <span>{placeholder}</span>
                {value === '' ? (
                  <Check className="size-4 shrink-0 text-brand" aria-hidden />
                ) : null}
              </button>
            </li>
            {options.map((option) => {
              const isSelected = option.id === value;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={!option.selectable}
                    onClick={() => {
                      onChange(option.id);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 px-3 py-2 text-start text-sm',
                      option.selectable
                        ? 'text-ink hover:bg-soft'
                        : 'cursor-not-allowed text-muted opacity-60',
                    )}
                  >
                    <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                      <span className="truncate font-bold">{option.fullName}</span>
                      <span dir="ltr" className="shrink-0 text-xs text-muted">
                        {option.slug}
                      </span>
                      {option.selectable ? null : (
                        <span className="shrink-0 text-xs">— قبلاً متصل شده</span>
                      )}
                    </span>
                    {isSelected ? (
                      <Check className="size-4 shrink-0 text-brand" aria-hidden />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <span className="text-xs text-muted">
        {loading
          ? 'در حال بارگذاری...'
          : options.length === 0
            ? `هنوز ${label}ی برای اتصال ندارید؛ ابتدا آن را بسازید.`
            : `می‌توانید این ${isBiolink ? 'بیولینک' : 'کارت ویزیت'} را به یکی از ${label}های خود متصل کنید.`}
      </span>
    </label>
  );
}
