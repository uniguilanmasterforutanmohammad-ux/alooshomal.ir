'use client';

import { useEffect, useState } from 'react';
import { Building2, MapPin, Search } from 'lucide-react';

import type { DirectoryFacet } from '@/lib/api';

export interface DirectoryFilterState {
  q: string;
  cityId: string;
  businessId: string;
  sort: 'recent' | 'liked';
}

interface Props {
  value: DirectoryFilterState;
  cities: DirectoryFacet[];
  businesses: DirectoryFacet[];
  onChange: (next: DirectoryFilterState) => void;
  onReset: () => void;
}

export function DirectoryFilters({
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
      {/* Indeed-style search bar. On mobile the fields stack full-width so
          nothing is cramped or clipped. */}
      <form
        className="flex flex-col gap-2 overflow-hidden rounded-lg border border-[var(--indeed-border)] bg-white shadow-sm md:flex-row md:gap-0"
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

        <div className="relative flex items-center border-b border-[var(--indeed-border)] md:flex-1 md:border-b-0 md:border-e">
          <MapPin
            className="pointer-events-none absolute end-3 size-4 text-muted"
            aria-hidden
          />
          <select
            className="h-12 w-full appearance-none bg-transparent px-4 pe-10 text-sm outline-none"
            value={draft.cityId}
            onChange={(event) => setDraft({ ...draft, cityId: event.target.value })}
          >
            <option value="">بر اساس شهر</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex items-center border-b border-[var(--indeed-border)] md:flex-1 md:border-b-0 md:border-e">
          <Building2
            className="pointer-events-none absolute end-3 size-4 text-muted"
            aria-hidden
          />
          <select
            className="h-12 w-full appearance-none bg-transparent px-4 pe-10 text-sm outline-none"
            value={draft.businessId}
            onChange={(event) => setDraft({ ...draft, businessId: event.target.value })}
          >
            <option value="">بر اساس نوع کسب و کار</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="h-12 shrink-0 bg-brand px-8 text-sm font-bold text-white transition hover:bg-brand-hover"
        >
          جستجو
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          مرتب‌سازی:
          <select
            className="ms-2 rounded-md border border-[var(--indeed-border)] bg-white px-2 py-1 text-sm font-bold text-ink outline-none"
            value={value.sort}
            onChange={(event) =>
              onChange({ ...draft, sort: event.target.value as 'recent' | 'liked' })
            }
          >
            <option value="recent">جدیدترین</option>
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
