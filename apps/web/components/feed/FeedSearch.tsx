'use client';

import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

interface Props {
  value: string;
  onSubmit: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

/**
 * Pill-shaped search field used by the Twitter-style feed: once in the right
 * sidebar on desktop and once in the collapsible mobile header panel. It keeps
 * a local draft so typing does not fire a request per keystroke; the query is
 * applied on submit (Enter) or when the clear button is pressed.
 */
export function FeedSearch({
  value,
  onSubmit,
  placeholder = 'جستجو در پست‌ها',
  autoFocus = false,
}: Props) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  return (
    <form
      role="search"
      className="tw-search"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(draft.trim());
      }}
    >
      <Search className="size-4 shrink-0 text-muted" aria-hidden />
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        aria-label="جستجوی پست‌ها"
        autoFocus={autoFocus}
      />
      {draft ? (
        <button
          type="button"
          onClick={() => {
            setDraft('');
            onSubmit('');
          }}
          className="tw-search-clear"
          aria-label="پاک کردن جستجو"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </form>
  );
}
