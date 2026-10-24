'use client';

import { useEffect, useState } from 'react';
import { Building2, MapPin, Search } from 'lucide-react';

import type { DirectoryFacet } from '@/lib/api';

export interface DirectoryFilterState {
  q: string;
  cityId: string;
  businessId: string;
  sort: 'recent' | 'liked' | 'alpha';
}

interface Props {
  value: DirectoryFilterState;
  cities: DirectoryFacet[];
  businesses: DirectoryFacet[];
  onChange: (next: DirectoryFilterState) => void;
  onReset: () => void;
}

export function DirectoryBiolinkFilters({
  value,
  cities,
  businesses,
  onChange,
  onReset,
}: Props) {
  // Draft state: edits stay local until the user presses «جستجو». Filtering on
  // every keystroke would hammer the server once the directory has thousands of
  // rows, so the query only fires on submit.
  const [draft, setDraft] = useState<DirectoryFilterState>(value);

  // Keep the draft aligned with the committed filters (e.g. after reset, or
  // when arriving with `?q=`/`?cityId=` in the URL).
  useEffect(() => {
    setDraft(value);
  }, [value]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    onChange(draft);
  }

  return (
    <div className="space-y-3">
      {/* Indeed-style search bar. On mobile the search field takes its own row
          and the city / business selects + submit button share a single row so
          the whole control stays compact. From `md` up everything is one row. */}
      <form
        className="flex flex-col gap-0 overflow-hidden rounded-lg border border-[var(--indeed-border)] bg-white shadow-sm md:flex-row"
        onSubmit={submit}
      >
        <div className="relative flex items-center border-b border-[var(--indeed-border)] md:flex-[2] md:border-b-0 md:border-e">
          <Search
            className="pointer-events-none absolute end-3 size-4 text-muted"
            aria-hidden
          />
          <input
            className="h-12 w-full bg-transparent px-4 pe-10 text-sm outline-none"
            placeholder="عنوان شغلی، نام یا کلمه کلیدی"
            value={draft.q}
            onChange={(event) => setDraft({ ...draft, q: event.target.value })}
          />
        </div>

        <div className="flex items-stretch md:contents">
          <div className="relative flex flex-1 items-center border-e border-[var(--indeed-border)] md:flex-1 md:border-e">
            <MapPin
              className="pointer-events-none absolute end-2 size-4 text-muted md:end-3"
              aria-hidden
            />
            <select
              className="h-12 w-full appearance-none bg-transparent px-2 pe-7 text-xs outline-none md:px-4 md:pe-10 md:text-sm"
              value={draft.cityId}
              onChange={(event) => setDraft({ ...draft, cityId: event.target.value })}
            >
              <option value="">شهر</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex flex-1 items-center border-e border-[var(--indeed-border)] md:flex-1 md:border-e">
            <Building2
              className="pointer-events-none absolute end-2 size-4 text-muted md:end-3"
              aria-hidden
            />
            <select
              className="h-12 w-full appearance-none bg-transparent px-2 pe-7 text-xs outline-none md:px-4 md:pe-10 md:text-sm"
              value={draft.businessId}
              onChange={(event) => setDraft({ ...draft, businessId: event.target.value })}
            >
              <option value="">نوع کسب‌وکار</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="h-12 flex-1 shrink-0 bg-brand px-3 text-xs font-bold text-white transition hover:bg-brand-hover md:flex-none md:px-8 md:text-sm"
          >
            جستجو
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          مرتب‌سازی:
          <select
            className="ms-2 rounded-md border border-[var(--indeed-border)] bg-white px-2 py-1 text-sm font-bold text-ink outline-none"
            value={value.sort}
            onChange={(event) =>
              onChange({
                ...draft,
                sort: event.target.value as 'recent' | 'liked' | 'alpha',
              })
            }
          >
            <option value="recent">جدیدترین</option>
            <option value="alpha">الفبا</option>
            <option value="liked">محبوب‌ترین</option>
          </select>
        </p>

        <button
          type="button"
          onClick={onReset}
          className="text-sm font-bold text-brand hover:underline"
        >
          پاک‌کردن فیلترها
        </button>
      </div>
    </div>
  );
}
