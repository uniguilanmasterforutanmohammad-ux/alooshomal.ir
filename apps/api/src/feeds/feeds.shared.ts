import { FeedTagKind, Prisma } from '@prisma/client';

export const feedPostInclude = {
  user: { select: { id: true, fullName: true, email: true } },
  topic: { select: { id: true, name: true } },
  _count: { select: { likes: true } },
} satisfies Prisma.FeedPostInclude;

/**
 * Resolves the public tag attached to a feed post: the author's own biolink or
 * business card, surfaced only once the tag fee has been confirmed by an admin.
 * Shared by the directory rows and the single-post payload so both link the
 * same way.
 */
export const feedTagInclude = {
  tagBiolink: {
    select: {
      slug: true,
      fullName: true,
      company: true,
      jobTitle: true,
      bio: true,
      avatarUrl: true,
      city: { select: { name: true } },
      business: { select: { name: true } },
    },
  },
  tagBusinessCard: {
    select: {
      slug: true,
      fullName: true,
      company: true,
      jobTitle: true,
      bio: true,
      avatarUrl: true,
      city: { select: { name: true } },
      business: { select: { name: true } },
    },
  },
} satisfies Prisma.FeedPostInclude;

/** Shape of a joined tag target (the author's own biolink or business card). */
export interface FeedTagTarget {
  slug: string;
  fullName: string;
  company: string | null;
  jobTitle: string | null;
  bio: string | null;
  avatarUrl: string | null;
  city: { name: string } | null;
  business: { name: string } | null;
}

/**
 * Turns the joined tag relations into one `tag` object. The tag is only exposed
 * once its fee has been paid (`tagPaid`), so an unpaid tag never leaks a link on
 * the public feed; the owning panels still see the raw `tag*` columns for their
 * own posts. Shared by the directory read-path and the user panel.
 */
export function projectFeedTag<
  T extends {
    tagKind?: FeedTagKind | null;
    tagPaid?: boolean;
    tagBiolink?: FeedTagTarget | null;
    tagBusinessCard?: FeedTagTarget | null;
  },
>(post: T) {
  const { tagBiolink, tagBusinessCard, ...rest } = post;
  const target = post.tagKind === FeedTagKind.BIOLINK ? tagBiolink : tagBusinessCard;
  const tag =
    post.tagPaid && post.tagKind && target
      ? {
          kind: post.tagKind,
          slug: target.slug,
          fullName: target.fullName,
          company: target.company,
          jobTitle: target.jobTitle,
          bio: target.bio,
          avatarUrl: target.avatarUrl,
          cityName: target.city?.name ?? null,
          businessName: target.business?.name ?? null,
          href:
            post.tagKind === FeedTagKind.BIOLINK
              ? `/biolinks/${target.slug}`
              : `/business-cards/${target.slug}`,
        }
      : null;
  return { ...rest, tag };
}
