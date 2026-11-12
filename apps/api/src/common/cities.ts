/**
 * Ordering of the «شهر» lists (public select, directory facets and admin
 * panels).
 *
 * The product focuses on these four main cities, which must always be listed
 * first, in this exact order; every other (sub-)city follows alphabetically.
 * «خرم آباد» is listed alongside «خرم‌آباد» because both spellings exist in the
 * imported data.
 */
export const MAIN_CITY_ORDER = [
  'تنکابن',
  'خرم‌آباد',
  'خرم آباد',
  'شیرود',
  'رامسر',
] as const;

function cityRank(name: string): number {
  const index = MAIN_CITY_ORDER.indexOf(name.trim() as (typeof MAIN_CITY_ORDER)[number]);
  return index === -1 ? MAIN_CITY_ORDER.length : index;
}

/** Stable city comparator: main cities first, then Persian alphabetical. */
export function compareCities(a: { name: string }, b: { name: string }): number {
  return (
    cityRank(a.name) - cityRank(b.name) ||
    a.name.localeCompare(b.name, 'fa')
  );
}

/** Returns a sorted copy of the given city rows. */
export function sortCities<T extends { name: string }>(rows: T[]): T[] {
  return [...rows].sort(compareCities);
}
