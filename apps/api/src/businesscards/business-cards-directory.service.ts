import { Injectable } from '@nestjs/common';
import { BiolinkStatus, Prisma } from '@prisma/client';

import {
  adDirectoryScopeMatches,
  businessCardOrderBy,
  DIRECTORY_ALPHA_MAX_ROWS,
  orderedByAlpha,
} from '../common/directory-sort';
import { sortCities } from '../common/cities';
import { FacetsCacheService } from '../common/facets-cache.service';
import { applyPlanMask } from '../common/plans';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { PublicBusinessCardQueryDto } from './dto/public-business-card-query.dto';

/** How long a directory page is cached before re-querying the database. */
const DIRECTORY_CACHE_TTL_MS = (() => {
  const parsed = Number(process.env.DIRECTORY_CACHE_TTL_MS ?? 15_000);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 15_000;
})();

/** One row of the public directory (without the per-visitor liked/saved flags). */
interface DirectoryBusinessCardItem {
  id: string;
  slug: string;
  fullName: string;
  jobTitle: string | null;
  company: string | null;
  bio: string | null;
  address: string | null;
  phone: string | null;
  mobile: string | null;
  /** «محله» — shown as a tag on the public page */
  neighborhood: string | null;
  avatarUrl: string | null;
  logoUrl: string | null;
  primaryColor: string;
  template: string;
  publishedAt: Date | null;
  pinnedAt: Date;
  boostedUntil: Date | null;
  adDirectoryUntil: Date | null;
  city: { id: string; name: string } | null;
  business: { id: string; name: string } | null;
  likeCount: number;
  /** aggregate review rating + count (kept in sync by the reviews service) */
  ratingAvg: number;
  ratingCount: number;
  /** The owner passed the paid identity inquiry and has the blue tick. */
  ownerVerified: boolean;
}

/**
 * Public business-card directory: search, filtering, facets and pagination.
 * Split out of the large `BusinessCardsService`.
 */
@Injectable()
export class BusinessCardsDirectoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly facetsCache: FacetsCacheService,
  ) {}

  /**
   * Public directory of published businessCards with search, filtering and pagination.
   */
  async findPublicDirectory(
    query: PublicBusinessCardQueryDto,
    visitorKey?: string,
    userId?: string,
  ) {
    const { page, q, cityId, businessId, sort } = query;

    // The page size is an admin-configurable setting; it overrides the query
    // limit so the frontend always fetches exactly one page worth of rows.
    const limit = await this.settings.getDirectoryPageSize();

    // Cache the anonymous "base" page (items + total) so repeated identical
    // searches/filters are served from Redis/memory instead of Postgres. The
    // per-visitor `liked`/`saved` flags are always resolved fresh below.
    const cacheKey = [
      'dir:businesscards',
      sort,
      cityId ?? '-',
      businessId ?? '-',
      q ? q.trim().toLowerCase() : '-',
      page,
      limit,
    ].join(':');

    const { items, total } = await this.facetsCache.get(cacheKey, () =>
      this.loadDirectoryPage(query, limit),
      DIRECTORY_CACHE_TTL_MS,
    );

    const facets = await this.getDirectoryFacets();

    const itemIds = items.map((item) => item.id);
    const [likedIds, savedIds] = await Promise.all([
      visitorKey
        ? this.prisma.businessCardLike
            .findMany({
              where: { visitorKey, businessCardId: { in: itemIds } },
              select: { businessCardId: true },
            })
            .then((rows) => new Set(rows.map((row) => row.businessCardId)))
        : Promise.resolve(new Set<string>()),
      userId
        ? this.prisma.businessCardSave
            .findMany({
              where: { userId, businessCardId: { in: itemIds } },
              select: { businessCardId: true },
            })
            .then((rows) => new Set(rows.map((row) => row.businessCardId)))
        : Promise.resolve(new Set<string>()),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        liked: likedIds.has(item.id),
        saved: savedIds.has(item.id),
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      filters: facets,
    };
  }

  /** Uncached database read for one directory page. */
  private async loadDirectoryPage(
    query: PublicBusinessCardQueryDto,
    limit: number,
  ): Promise<{ items: DirectoryBusinessCardItem[]; total: number }> {
    const { page, q, cityId, businessId, sort } = query;

    const where: Prisma.BusinessCardWhereInput = {
      status: BiolinkStatus.APPROVED,
      isPublished: true,
      ...(cityId ? { cityId } : {}),
      ...(businessId ? { businessId } : {}),
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: 'insensitive' } },
              { jobTitle: { contains: q, mode: 'insensitive' } },
              { company: { contains: q, mode: 'insensitive' } },
              { bio: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const select = {
      id: true,
      slug: true,
      fullName: true,
      jobTitle: true,
      company: true,
      bio: true,
      address: true,
      phone: true,
      mobile: true,
      neighborhood: true,
      avatarUrl: true,
      logoUrl: true,
      primaryColor: true,
      template: true,
      ratingAvg: true,
      ratingCount: true,
      publishedAt: true,
      pinnedAt: true,
      boostedUntil: true,
      adDirectoryUntil: true,
      city: { select: { id: true, name: true } },
      business: { select: { id: true, name: true } },
      // The owner's plan decides which contact fields are masked on the public
      // row (a plan that hides «تلفن همراه / ثابت» nulls phone + mobile).
      user: {
        select: {
          verifiedAt: true,
          plan: { select: { showSocialLinks: true, hiddenFields: true } },
        },
      },
      _count: { select: { likes: true } },
    } satisfies Prisma.BusinessCardSelect;

    type DirectoryRow = Prisma.BusinessCardGetPayload<{ select: typeof select }>;

    // Shape one raw row into the public directory item: derive `likeCount`, drop
    // the paid-ad timestamp outside the city+business slice (so the «تبلیغات»
    // badge cannot advertise itself), and apply the owner's plan mask.
    const project = (row: DirectoryRow, keepAdBadge: boolean) => {
      const { _count, user, ...item } = row;
      const masked = applyPlanMask(
        {
          ...item,
          adDirectoryUntil: keepAdBadge ? item.adDirectoryUntil : null,
          likeCount: _count.likes,
        },
        user?.plan,
      );
      return {
        ...masked,
        ownerVerified: Boolean(user?.verifiedAt),
      } as unknown as DirectoryBusinessCardItem;
    };

    const pageSize = limit;
    const skip = (page - 1) * pageSize;
    const adScoped = adDirectoryScopeMatches(cityId, businessId);

    // Alphabetical mode orders the whole Persian-alphabet candidate set in JS
    // (the database collation misorders Persian letters) and then slices the
    // requested page — see `orderedByAlpha`. The explicit alphabetical order is
    // taken at face value: paid ads still show their badge but are not lifted
    // above the letters, so the list stays alphabetical as the visitor asked.
    if (sort === 'alpha') {
      const rows = await this.prisma.businessCard.findMany({
        where,
        select,
        orderBy: [{ fullName: 'asc' }, { id: 'desc' }],
        take: DIRECTORY_ALPHA_MAX_ROWS,
      });
      const ordered = orderedByAlpha(rows.map((row) => project(row, adScoped)));
      return { items: ordered.slice(skip, skip + pageSize), total: ordered.length };
    }

    // A paid directory ad only lifts an item when the visitor narrowed the list
    // down to the item's own city *and* business — see
    // `adDirectoryScopeMatches`. Paid ads sit above boosts, which sit above the
    // plain chronological rows. A boost («پله») is *not* scoped: it re-pins the
    // item (see boosts.service) so it tops the whole list, and automatically
    // drops down once a newer item is created.
    if (adScoped) {
      const now = new Date();
      const adWhere: Prisma.BusinessCardWhereInput = {
        ...where,
        adDirectoryUntil: { gt: now },
      };
      // Boosts («پله») are part of the chronological rows: their `pinnedAt` was
      // reset on approval, so they are already the newest. Only paid ads are
      // pulled out into their own group above them.
      const regularWhere: Prisma.BusinessCardWhereInput = {
        AND: [
          where,
          { OR: [{ adDirectoryUntil: null }, { adDirectoryUntil: { lte: now } }] },
        ],
      };
      const take = pageSize + skip;
      const [adRows, regularRows, total] = await Promise.all([
        this.prisma.businessCard.findMany({
          where: adWhere,
          select,
          orderBy: [{ adDirectoryUntil: 'desc' }, { id: 'desc' }],
          take,
        }),
        this.prisma.businessCard.findMany({
          where: regularWhere,
          select,
          orderBy: businessCardOrderBy(sort),
          take,
        }),
        this.prisma.businessCard.count({ where }),
      ]);

      const items = [...adRows, ...regularRows]
        .slice(skip, skip + pageSize)
        .map((row) => project(row, true));
      return { items, total };
    }

    const [rows, total] = await Promise.all([
      this.prisma.businessCard.findMany({
        where,
        select,
        orderBy: businessCardOrderBy(sort),
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.businessCard.count({ where }),
    ]);

    // Outside the city+business slice a paid ad must not advertise itself, so
    // the «تبلیغات» tag is dropped (handled in `project`). The «پله» timestamp
    // is kept so the boosted row still shows its badge while it sits at the top
    // of the whole directory.
    const items = rows.map((row) => project(row, false));
    return { items, total };
  }

  /**
   * Active cities/businesses that actually have a published card. Cached
   * briefly because it is identical across directory requests.
   */
  private getDirectoryFacets() {
    return this.facetsCache.get('businesscards:facets', async () => {
      const [cities, businesses] = await Promise.all([
        this.prisma.city.findMany({
          where: {
            isActive: true,
            businessCards: {
              some: { status: BiolinkStatus.APPROVED, isPublished: true },
            },
          },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        this.prisma.businessCategory.findMany({
          where: {
            isActive: true,
            businessCards: {
              some: { status: BiolinkStatus.APPROVED, isPublished: true },
            },
          },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
      ]);
      // Cities keep the «main cities first» order shared with the city select.
      return { cities: sortCities(cities), businesses };
    });
  }
}
