'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

import { api, type TaxonomyNodeSearchResult } from '@/lib/api';

/** What the user picked in the search box. */
export type TaxonomyPick =
  | { kind: 'TAG'; name: string; parentName: string | null }
  | { kind: 'SUB'; name: string }
  | { kind: 'OTHER'; name: string }
  | { kind: 'CLEAR'; name: '' };

interface Props {
  label: string;
  /** main category the search is limited to (`''` = none chosen yet) */
  categoryId: string;
  /** currently selected label (`''` = nothing selected) */
  value: string;
  /** level of the current selection, for the little badge (`null` = unknown) */
  kind: 'SUB' | 'TAG' | 'OTHER' | null;
  onChange: (pick: TaxonomyPick) => void;
  placeholder?: string;
  /** message shown while the field is disabled */
  disabledHint?: string;
}

const KIND_LABEL: Record<'SUB' | 'TAG' | 'OTHER', string> = {
  SUB: 'زیردسته',
  TAG: 'زیرشاخه',
  OTHER: 'سایر',
};

/**
 * Single search box for the deeper taxonomy levels. The tree has thousands of
 * entries, so instead of two dropdowns the user types once and the API walks
 * the levels automatically — «زیرشاخه» first and, only when nothing matches,
 * «زیردسته». If no level matches at all the typed term is forwarded to the
 * admin team and the builder shows «سایر».
 *
 * Callers must remount the picker (via `key`) when the main category changes,
 * which resets the query state.
 */
export function TaxonomyNodePicker({
  label,
  categoryId,
  value,
  kind,
  onChange,
  placeholder,
  disabledHint,
}: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<TaxonomyNodeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against an older response overwriting a newer one.
  const requestRef = useRef(0);
  const listboxId = useId();

  const isDisabled = !categoryId;
  const term = query.trim();
  // The «سایر» row is offered only once the search came back empty.
  const showOther = !loading && results.length === 0 && term.length > 0;
  const rowCount = results.length + (showOther ? 1 : 0);

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
    setSendError(null);
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
      const params = new URLSearchParams({
        level: 'ANY',
        q: text,
        limit: '20',
      });
      if (categoryId) params.set('categoryId', categoryId);
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

  function close() {
    setQuery('');
    setResults([]);
    setOpen(false);
    setSendError(null);
  }

  function pickResult(node: TaxonomyNodeSearchResult) {
    onChange(
      node.level === 'TAG'
        ? { kind: 'TAG', name: node.name, parentName: node.parentName }
        : { kind: 'SUB', name: node.name },
    );
    close();
  }

  /** No level matched: hand the term to the admins and show «سایر». */
  async function pickOther() {
    const text = term;
    if (!text || sending) return;
    setSending(true);
    setSendError(null);
    try {
      await api.post('/business-taxonomy/requests', {
        q: text,
        ...(categoryId ? { categoryId } : {}),
      });
    } catch {
      // The API client already surfaced the failure; keep the box open so the
      // user can retry instead of silently losing the request.
      setSendError('ارسال درخواست به مدیر ناموفق بود؛ دوباره تلاش کنید.');
      setSending(false);
      return;
    }
    setSending(false);
    onChange({ kind: 'OTHER', name: text });
    close();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open || rowCount === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((index) => (index + 1) % rowCount);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((index) => (index - 1 + rowCount) % rowCount);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const node = results[highlight];
      if (node) pickResult(node);
      else if (showOther) void pickOther();
    }
  }

  return (
    <div ref={boxRef} className="relative flex flex-col gap-1.5">
      <span className="text-sm font-bold text-ink">
        {label}
        <span className="ms-1 text-xs font-normal text-muted">
          (ابتدا زیرشاخه، سپس زیردسته)
        </span>
      </span>

      {value ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-[var(--indeed-border)] bg-white px-3 py-2">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm text-ink">{value}</span>
            {kind ? (
              <span className="shrink-0 rounded-full bg-soft px-2 py-0.5 text-[10px] font-bold text-muted">
                {KIND_LABEL[kind]}
              </span>
            ) : null}
          </span>
          <button
            type="button"
            onClick={() => onChange({ kind: 'CLEAR', name: '' })}
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
            placeholder={placeholder ?? 'برای جست‌وجو تایپ کنید...'}
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
            <li className="px-3 py-2 text-xs text-muted">در حال جست‌وجو…</li>
          ) : (
            <>
              {results.map((node, index) => (
                <li key={node.id} role="option" aria-selected={index === highlight}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => pickResult(node)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-start text-sm ${
                      index === highlight
                        ? 'bg-brand/10 font-bold text-brand'
                        : 'text-ink hover:bg-soft'
                    }`}
                  >
                    <span className="truncate">{node.name}</span>
                    <span className="shrink-0 rounded-full bg-soft px-2 py-0.5 text-[10px] font-bold text-muted">
                      {KIND_LABEL[node.level]}
                    </span>
                  </button>
                </li>
              ))}
              {showOther ? (
                <li
                  role="option"
                  aria-selected={highlight === results.length}
                  className="border-t border-[var(--indeed-border)]"
                >
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(results.length)}
                    onClick={() => void pickOther()}
                    disabled={sending}
                    className={`block w-full px-3 py-2 text-start text-sm disabled:opacity-60 ${
                      highlight === results.length
                        ? 'bg-brand/10 font-bold text-brand'
                        : 'text-ink hover:bg-soft'
                    }`}
                  >
                    سایر
                    <span className="mt-0.5 block text-[11px] font-normal text-muted">
                      {sending
                        ? 'در حال ارسال درخواست برای مدیر…'
                        : 'موردی یافت نشد؛ با انتخاب این گزینه عبارت شما برای مدیر ارسال می‌شود.'}
                    </span>
                  </button>
                </li>
              ) : null}
            </>
          )}
        </ul>
      ) : null}

      {sendError ? (
        <span className="text-xs text-red-600">{sendError}</span>
      ) : !categoryId && disabledHint ? (
        <span className="text-xs text-muted">{disabledHint}</span>
      ) : null}
    </div>
  );
}
