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
