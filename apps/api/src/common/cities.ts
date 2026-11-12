/**
 * The site keeps exactly these four cities. Everything else the scraper saw is
 * a *region/neighbourhood* inside one of them (کتالم، سخت‌سر، میر شمس‌الدین،
 * خرم‌آبادِ تنکابن، …) and is folded into the matching city on import; the
 * merged «تنکابن، شیرود» bucket is split between تنکابن and شیرود. They are
 * listed first, in this exact order (the product's expected order).
 */
export const CANONICAL_CITIES = [
  'تنکابن',
  'خرم‌آباد',
  'شیرود',
  'رامسر',
] as const;

/**
 * Ordering of the «شهر» lists (public select, directory facets and admin
 * panels). «خرم آباد» (plain space) is accepted as the same place as
 * «خرم‌آباد» (ZWNJ) so any legacy row still sorts correctly.
 */
export const MAIN_CITY_ORDER = [
  'تنکابن',
  'خرم‌آباد',
  'خرم آباد',
  'شیرود',
  'رامسر',
] as const;

/** Normalises the spellings of a city into its canonical form. */
export function canonicalCityName(name: string): string {
  return name.trim().replace(/خرم آباد/g, 'خرم\u200cآباد');
}

/** Whether `name` is one of the four cities the site keeps. */
export function isCanonicalCity(name: string): boolean {
  const value = canonicalCityName(name);
  return (CANONICAL_CITIES as readonly string[]).includes(value);
}

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
