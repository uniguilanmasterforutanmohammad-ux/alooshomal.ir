import { BoostTargetKind } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

/** A human-readable label for one boosted target item. */
export interface BoostTargetLabel {
  id: string;
  fullName: string;
  slug: string;
}

/**
 * Resolve the human-readable label (item name + slug) for a mixed batch of
 * boost/ad requests, regardless of which kind of target each one points at.
 */
export async function resolveBoostTargetLabels(
  prisma: PrismaService,
  requests: Array<{ kind: BoostTargetKind; targetId: string }>,
): Promise<Map<string, BoostTargetLabel>> {
  const biolinkIds = requests
    .filter((r) => r.kind === BoostTargetKind.BIOLINK)
    .map((r) => r.targetId);
  const cardIds = requests
    .filter((r) => r.kind === BoostTargetKind.BUSINESS_CARD)
    .map((r) => r.targetId);
  const feedIds = requests
    .filter((r) => r.kind === BoostTargetKind.FEED)
    .map((r) => r.targetId);

  const [biolinks, cards, feeds] = await Promise.all([
    biolinkIds.length
      ? prisma.biolink.findMany({
          where: { id: { in: biolinkIds } },
          select: { id: true, fullName: true, slug: true },
        })
      : Promise.resolve([]),
    cardIds.length
      ? prisma.businessCard.findMany({
          where: { id: { in: cardIds } },
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

  const map = new Map<string, BoostTargetLabel>();
  [...biolinks, ...cards].forEach((item) => map.set(item.id, item));
  feeds.forEach((item) =>
    map.set(item.id, {
      id: item.id,
      fullName: item.body?.slice(0, 40) || 'پست فید',
      slug: item.id,
    }),
  );
  return map;
}
