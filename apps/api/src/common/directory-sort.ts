import { Prisma } from '@prisma/client';

export type DirectorySort = 'recent' | 'liked';

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
 * Where an approved promotion (boost «پله» or a paid directory ad) is allowed
 * to lift an item. Both only promote their item to the top of the directory
 * when the visitor has narrowed the list down to *both* the city and the
 * business category the item belongs to — exactly the slice the advertiser paid
 * for. Anything broader (no filter or a single filter) keeps the plain
 * chronological order.
 */
export function boostScopeMatches(cityId?: string, businessId?: string): boolean {
  return Boolean(cityId && businessId);
}
