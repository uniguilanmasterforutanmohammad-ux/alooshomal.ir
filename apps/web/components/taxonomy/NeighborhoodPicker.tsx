'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { MapPin, Plus, Search, X } from 'lucide-react';

import { api } from '@/lib/api';

interface Props {
  label?: string;
  /** city the card belongs to; suggestions are limited to it (`''` = all) */
  cityId?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}

/**
 * «محله» picker. The value is free-form — a user may always type a neighbourhood
 * that is not in the list — so this is a search box with suggestions taken from
 * the neighbourhoods already recorded for the chosen city, plus an explicit
 * «افزودن …» row for a brand-new term.
 */
export function NeighborhoodPicker({
  label = 'محله',
  cityId,
  value,
  onChange,
  placeholder = 'مثلاً: کریم‌آباد، روستای کلک، ...',
  hint,
}: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against an older response overwriting a newer one.
  const requestRef = useRef(0);
  const listboxId = useId();

  const term = query.trim();
  const exact = results.some((row) => row === term);
  const rows = term && !exact ? [...results, term] : results;
  const showAdd = Boolean(term) && !exact;

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

  function runSearch(raw: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    const text = raw.trim();
    setLoading(true);
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    const params = new URLSearchParams({ limit: '20' });
    if (text) params.set('q', text);
    if (cityId) params.set('cityId', cityId);
    timerRef.current = setTimeout(() => {
      api
        .get<string[]>(`/business-taxonomy/neighborhoods?${params.toString()}`)
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

  function commit(next: string) {
    const clean = next.trim();
    if (!clean) return;
    onChange(clean);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open || rows.length === 0) {
      if (event.key === 'Enter' && term) {
        event.preventDefault();
        commit(term);
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((prev) => (prev + 1) % rows.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((prev) => (prev - 1 + rows.length) % rows.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      commit(rows[highlight] ?? term);
    }
  }

  return (
    <div ref={boxRef} className="relative flex flex-col gap-1.5">
      <span className="text-sm font-bold text-ink">
        {label}
        <span className="ms-1 text-xs font-normal text-muted">(اختیاری)</span>
      </span>

      {value ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-[var(--indeed-border)] bg-white px-3 py-2">
          <span className="flex min-w-0 items-center gap-2">
            <MapPin className="size-4 shrink-0 text-brand" aria-hidden />
            <span className="truncate text-sm text-ink">{value}</span>
          </span>
          <button
            type="button"
            onClick={() => onChange('')}
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
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            className="indeed-input pe-9"
            placeholder={placeholder}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              runSearch(event.target.value);
            }}
            onFocus={() => {
              setOpen(true);
              runSearch(query);
            }}
            onKeyDown={handleKeyDown}
          />
        </div>
      )}

      {open && !value ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-60 overflow-auto rounded-md border border-[var(--indeed-border)] bg-white py-1 shadow-xl"
        >
          {loading && rows.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted">در حال جست‌وجو…</li>
          ) : (
            <>
              {results.map((row, index) => (
                <li key={row} role="option" aria-selected={index === highlight}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => commit(row)}
                    className={`block w-full truncate px-3 py-2 text-start text-sm ${
                      index === highlight
                        ? 'bg-brand/10 font-bold text-brand'
                        : 'text-ink hover:bg-soft'
                    }`}
                  >
                    {row}
                  </button>
                </li>
              ))}
              {showAdd ? (
                <li
                  role="option"
                  aria-selected={highlight === results.length}
                  className="border-t border-[var(--indeed-border)]"
                >
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(results.length)}
                    onClick={() => commit(term)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-start text-sm ${
                      highlight === results.length
                        ? 'bg-brand/10 font-bold text-brand'
                        : 'text-ink hover:bg-soft'
                    }`}
                  >
                    <Plus className="size-4 shrink-0" aria-hidden />
                    <span className="truncate">
                      افزودن «{term}»
                    </span>
                  </button>
                </li>
              ) : null}
              {!term && results.length === 0 && !loading ? (
                <li className="px-3 py-2 text-xs text-muted">
                  محله‌ای ثبت نشده؛ عبارت دلخواه را وارد کنید.
                </li>
              ) : null}
            </>
          )}
        </ul>
      ) : null}

      {hint && !value ? <span className="text-xs text-muted">{hint}</span> : null}
    </div>
  );
}
