'use client';

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
  return (
    <div className="space-y-3">
      {/* Indeed-style search bar */}
      <form
        className="flex overflow-hidden rounded-lg border border-[var(--indeed-border)] bg-white shadow-sm"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="relative flex flex-[2] items-center border-e border-[var(--indeed-border)]">
          <Search
            className="pointer-events-none absolute end-3 size-4 text-muted"
            aria-hidden
          />
          <input
            className="h-12 w-full bg-transparent px-4 pe-10 text-sm outline-none"
            placeholder="عنوان شغلی، نام یا کلمه کلیدی"
            value={value.q}
            onChange={(event) => onChange({ ...value, q: event.target.value })}
          />
        </div>

        <div className="relative hidden flex-1 items-center border-e border-[var(--indeed-border)] md:flex">
          <MapPin
            className="pointer-events-none absolute end-3 size-4 text-muted"
            aria-hidden
          />
          <select
            className="h-12 w-full appearance-none bg-transparent px-4 pe-10 text-sm outline-none"
            value={value.cityId}
            onChange={(event) => onChange({ ...value, cityId: event.target.value })}
          >
            <option value="">بر اساس شهر</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative hidden flex-1 items-center md:flex">
          <Building2
            className="pointer-events-none absolute end-3 size-4 text-muted"
            aria-hidden
          />
          <select
            className="h-12 w-full appearance-none bg-transparent px-4 pe-10 text-sm outline-none"
            value={value.businessId}
            onChange={(event) => onChange({ ...value, businessId: event.target.value })}
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
              onChange({ ...value, sort: event.target.value as 'recent' | 'liked' })
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
