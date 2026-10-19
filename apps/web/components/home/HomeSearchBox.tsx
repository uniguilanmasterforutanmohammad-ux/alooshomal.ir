'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, MapPin, Search } from 'lucide-react';

import { api, type TaxonomyItem } from '@/lib/api';

/**
 * Home-page search box: the visitor types a keyword and optionally picks a city
 * and a business category, then lands on the published business-card directory
 * with those same filters applied (`?q=&cityId=&businessId=`). The directory
 * page already reads those params into its filter state, so the two stay in
 * sync and the resulting URL is shareable.
 */
export function HomeSearchBox() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [cityId, setCityId] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [cities, setCities] = useState<TaxonomyItem[]>([]);
  const [businesses, setBusinesses] = useState<TaxonomyItem[]>([]);

  useEffect(() => {
    let active = true;
    api
      .get<TaxonomyItem[]>('/cities')
      .then((rows) => {
        if (active) setCities(rows);
      })
      .catch(() => setCities([]));
    api
      .get<TaxonomyItem[]>('/businesses')
      .then((rows) => {
        if (active) setBusinesses(rows);
      })
      .catch(() => setBusinesses([]));
    return () => {
      active = false;
    };
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    const keyword = q.trim();
    if (keyword) params.set('q', keyword);
    if (cityId) params.set('cityId', cityId);
    if (businessId) params.set('businessId', businessId);
    const query = params.toString();
    router.push(query ? `/business-cards?${query}` : '/business-cards');
  }

  return (
    <form
      className="mx-auto mt-8 flex max-w-3xl flex-col overflow-hidden rounded-lg border border-[var(--indeed-border)] bg-brand text-start shadow-lg md:flex-row"
      onSubmit={submit}
      role="search"
    >
      <div className="relative flex items-center border-b border-[var(--indeed-border)] md:flex-[2] md:border-b-0 md:border-e">
        <Search
          className="pointer-events-none absolute end-3 size-4 text-white"
          aria-hidden
        />
        <input
          className="h-12 w-full bg-transparent px-4 pe-10 text-sm text-white outline-none placeholder:text-white"
          placeholder="عنوان شغلی، نام یا کلمه کلیدی"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          aria-label="عبارت جستجو"
        />
      </div>

      <div className="flex items-stretch md:contents">
        <div className="relative flex flex-1 items-center border-e border-[var(--indeed-border)]">
          <MapPin
            className="pointer-events-none absolute end-2 size-4 text-white md:end-3"
            aria-hidden
          />
          <select
            className="h-12 w-full appearance-none bg-transparent px-2 pe-7 text-xs text-white outline-none md:px-4 md:pe-10 md:text-sm"
            value={cityId}
            onChange={(event) => setCityId(event.target.value)}
            aria-label="انتخاب شهر"
          >
            <option value="" className="text-ink">
              شهر
            </option>
            {cities.map((city) => (
              <option key={city.id} value={city.id} className="text-ink">
                {city.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex flex-1 items-center border-e border-[var(--indeed-border)]">
          <Building2
            className="pointer-events-none absolute end-2 size-4 text-white md:end-3"
            aria-hidden
          />
          <select
            className="h-12 w-full appearance-none bg-transparent px-2 pe-7 text-xs text-white outline-none md:px-4 md:pe-10 md:text-sm"
            value={businessId}
            onChange={(event) => setBusinessId(event.target.value)}
            aria-label="انتخاب کسب‌وکار"
          >
            <option value="" className="text-ink">
              نوع کسب‌وکار
            </option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id} className="text-ink">
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
  );
}
