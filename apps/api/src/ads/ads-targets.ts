import { AdTargetKind, BoostStatus, PaymentStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

/** Where an approved ad sits in its display window, for the user/admin panels. */
export type AdDisplayState =
  | 'PENDING'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'REJECTED';

/** A human-readable label for one requested ad target. */
export interface AdTargetLabel {
  id: string;
  fullName: string;
  slug: string;
}

/**
 * Only ads whose fee is settled (or that never needed one, i.e. the gateway was
 * off) may enter the admin review queue.
 */
export function reviewableWhere(): Prisma.AdRequestWhereInput {
  return {
    OR: [{ payment: null }, { payment: { status: PaymentStatus.PAID } }],
  };
}

/** Derived display state of one ad request in the review windows. */
export function displayStateOf(
  request: {
    status: BoostStatus;
    startedAt: Date | null;
    endsAt: Date | null;
  },
  now: Date,
): AdDisplayState {
  if (request.status === BoostStatus.PENDING) return 'PENDING';
  if (request.status === BoostStatus.REJECTED) return 'REJECTED';
  if (!request.endsAt) return 'ACTIVE';
  if (request.endsAt.getTime() <= now.getTime()) return 'EXPIRED';
  if (request.startedAt && request.startedAt.getTime() > now.getTime()) {
    return 'SCHEDULED';
  }
  return 'ACTIVE';
}

/** Batch-resolve the human-readable label of every requested target. */
export async function resolveAdTargetLabels(
  prisma: PrismaService,
  requests: Array<{ kind: AdTargetKind; targetId: string }>,
): Promise<Map<string, AdTargetLabel>> {
  const cardIds = requests
    .filter((r) => r.kind === AdTargetKind.BUSINESS_CARD)
    .map((r) => r.targetId);
  const biolinkIds = requests
    .filter((r) => r.kind === AdTargetKind.BIOLINK)
    .map((r) => r.targetId);
  const feedIds = requests
    .filter((r) => r.kind === AdTargetKind.FEED)
    .map((r) => r.targetId);

  const [cards, biolinks, feeds] = await Promise.all([
    cardIds.length
      ? prisma.businessCard.findMany({
          where: { id: { in: cardIds } },
          select: { id: true, fullName: true, slug: true },
        })
      : Promise.resolve([]),
    biolinkIds.length
      ? prisma.biolink.findMany({
          where: { id: { in: biolinkIds } },
          select: { id: true, fullName: true, slug: true },
        })
      : Promise.resolve([]),
    feedIds.length
      ? prisma.feedPost.findMany({
          where: { id: { in: feedIds } },
          select: { id: true, body: true },
        })
      : Promise.resolve([]),
  ]);
  const map = new Map<string, AdTargetLabel>();
  [...cards, ...biolinks].forEach((item) => map.set(item.id, item));
  feeds.forEach((item) =>
    map.set(item.id, {
      id: item.id,
      fullName: item.body?.slice(0, 40) || 'پست فید',
      slug: item.id,
    }),
  );
  return map;
}
