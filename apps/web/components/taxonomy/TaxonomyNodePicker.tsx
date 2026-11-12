'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

import { api, type TaxonomyNodeSearchResult } from '@/lib/api';

interface Props {
  label: string;
  /** `SUB` = «زیردسته»، `TAG` = «زیرشاخه» */
  level: 'SUB' | 'TAG';
  /** main category the node must belong to (`''` = none chosen yet) */
  categoryId: string;
  /** for `TAG`: the chosen «زیردسته» id (preferred anchor) */
  parentId?: string | null;
  /** for `TAG`: the chosen «زیردسته» name (used when the id is unknown) */
  parentName?: string | null;
  /** selected node name (`''` = nothing selected) */
  value: string;
  onChange: (name: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** message shown while the field is disabled */
  disabledHint?: string;
}

/**
 * Type-ahead picker for the deeper taxonomy levels. The tree has thousands of
 * entries, so — unlike the main-category select — this is a search box: the
 * user types, the component asks the API for a short filtered list and shows
 * the matches. The main category (and, for tags, the sub-category) narrows the
 * search space, so the user only ever sees a handful of relevant options.
 *
 * Callers must remount the picker (via `key`) when its anchors change, which
 * resets the query/selection state.
 */
export function TaxonomyNodePicker({
  label,
  level,
  categoryId,
  parentId,
  parentName,
  value,
  onChange,
  disabled,
  placeholder,
  disabledHint,
}: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<TaxonomyNodeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against an older response overwriting a newer one.
  const requestRef = useRef(0);
  const listboxId = useId();

  const isDisabled = disabled || !categoryId;
  const term = query.trim();

  // Close the suggestion list when clicking anywhere outside the field.
  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  /** Debounced lookup, driven from the input handlers (never on first render). */
  function runSearch(raw: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    const text = raw.trim();
    if (!text || isDisabled) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams({ level, q: text, limit: '20' });
      if (categoryId) params.set('categoryId', categoryId);
      if (level === 'TAG') {
        if (parentId) params.set('parentId', parentId);
        else if (parentName) params.set('parentName', parentName);
      }
      api
        .get<TaxonomyNodeSearchResult[]>(
          `/business-taxonomy/search?${params.toString()}`,
        )
        .then((rows) => {
          if (requestRef.current !== requestId) return;
          setResults(rows);
          setHighlight(0);
        })
        .catch(() => {
          if (requestRef.current === requestId) setResults([]);
        })
        .finally(() => {
          if (requestRef.current === requestId) setLoading(false);
        });
    }, 250);
  }

  function handleQueryChange(next: string) {
    setQuery(next);
    setOpen(true);
    runSearch(next);
  }

  function select(name: string) {
    onChange(name);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open || results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const picked = results[highlight];
      if (picked) select(picked.name);
    }
  }

  return (
    <div ref={boxRef} className="relative flex flex-col gap-1.5">
      <span className="text-sm font-bold text-ink">
        {label}
        <span className="ms-1 text-xs font-normal text-muted">(با جستجو)</span>
      </span>

      {value ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-[var(--indeed-border)] bg-white px-3 py-2">
          <span className="truncate text-sm text-ink">{value}</span>
          <button
            type="button"
            onClick={() => select('')}
            className="shrink-0 rounded p-0.5 text-muted hover:bg-soft hover:text-ink"
            aria-label={`حذف ${label}`}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search
            className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="text"
            role="combobox"
            aria-expanded={open && Boolean(term)}
            aria-controls={listboxId}
            aria-autocomplete="list"
            className="indeed-input pe-9 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder={placeholder ?? 'برای جستجو تایپ کنید...'}
            value={query}
            disabled={isDisabled}
            onChange={(event) => handleQueryChange(event.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
          />
        </div>
      )}

      {open && !value && term && !isDisabled ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-60 overflow-auto rounded-md border border-[var(--indeed-border)] bg-white py-1 shadow-xl"
        >
          {loading && results.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted">در حال جستجو…</li>
          ) : results.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted">نتیجه‌ای یافت نشد</li>
          ) : (
            results.map((node, index) => (
              <li key={node.id} role="option" aria-selected={index === highlight}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => select(node.name)}
                  className={`block w-full truncate px-3 py-2 text-start text-sm ${
                    index === highlight
                      ? 'bg-brand/10 font-bold text-brand'
                      : 'text-ink hover:bg-soft'
                  }`}
                >
                  {node.name}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}

      {!categoryId && disabledHint ? (
        <span className="text-xs text-muted">{disabledHint}</span>
      ) : null}
    </div>
  );
}
