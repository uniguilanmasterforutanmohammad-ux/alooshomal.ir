import { Prisma } from '@prisma/client';

export type DirectorySort = 'recent' | 'liked' | 'alpha';

/**
 * Upper bound on how many rows the alphabetical directory ordering considers
 * for one request. Postgres uses the database's `en_US.utf8` collation which
 * misorders Persian letters (e.g. «چ» sorts after «ح»), so the alphabetical
 * list is ordered in JS with `Intl.Collator('fa')`. The whole candidate set is
 * therefore pulled once and sliced into the requested page; the cap keeps a
 * runaway directory from turning one request into an unbounded transfer.
 */
export const DIRECTORY_ALPHA_MAX_ROWS = 2_000;

/**
 * Sort rows Persian-alphabetically by full name (ties broken by newest id).
 * Shared by the «الفبا» directory sort and the public دفترچه تلفن.
 */
export function orderedByAlpha<T extends { fullName: string; id: string }>(
  rows: T[],
): T[] {
  const collator = new Intl.Collator('fa');
  return [...rows].sort(
    (a, b) => collator.compare(a.fullName, b.fullName) || (a.id < b.id ? 1 : -1),
  );
}

/**
 * Directory ordering for biolinks.
 *
 *  - `recent` → newest by `pinnedAt`. `pinnedAt` starts equal to the creation
 *    time and is only reset when an admin approves a "پله" (boost) request, so a
 *    boosted item sorts as if it were brand-new until newer items appear.
 *  - `liked`  → most liked first (relation count), newest as tie-break.
 */
export function biolinkOrderBy(
  sort: DirectorySort,
): Prisma.BiolinkOrderByWithRelationInput[] {
  switch (sort) {
    case 'liked':
      return [{ likes: { _count: 'desc' } }, { pinnedAt: 'desc' }, { id: 'desc' }];
    default:
      return [{ pinnedAt: 'desc' }, { id: 'desc' }];
  }
}

/** Same ordering rules as {@link biolinkOrderBy} but for business cards. */
export function businessCardOrderBy(
  sort: DirectorySort,
): Prisma.BusinessCardOrderByWithRelationInput[] {
  switch (sort) {
    case 'liked':
      return [{ likes: { _count: 'desc' } }, { pinnedAt: 'desc' }, { id: 'desc' }];
    default:
      return [{ pinnedAt: 'desc' }, { id: 'desc' }];
  }
}

/**
 * Where a paid directory ad («تبلیغ در دایرکتوری») is allowed to lift an item.
 * Ads are targeted: they only rise to the top when the visitor narrowed the
 * list down to *both* the city and the business category the item belongs to —
 * exactly the slice the advertiser paid for. Anything broader (no filter or a
 * single filter) keeps the plain chronological order.
 *
 * NB: the boost «پله» is intentionally *not* scoped — it re-pins the item as if
 * it were brand-new, so it rises to the top of the whole directory and only
 * drops when a newer item is created.
 */
export function adDirectoryScopeMatches(
  cityId?: string,
  businessId?: string,
): boolean {
  return Boolean(cityId && businessId);
}
