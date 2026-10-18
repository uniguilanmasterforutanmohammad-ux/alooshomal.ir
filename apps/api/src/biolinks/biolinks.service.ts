import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BiolinkStatus, NotificationType, Prisma } from '@prisma/client';
import * as QRCode from 'qrcode';

import {
  adDirectoryScopeMatches,
  biolinkOrderBy,
} from '../common/directory-sort';
import { FacetsCacheService } from '../common/facets-cache.service';
import { planLimitsFrom } from '../common/plans';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreateBiolinkDto } from './dto/create-biolink.dto';
import { PublicBiolinkQueryDto } from './dto/public-biolink-query.dto';
import { UpdateBiolinkDto } from './dto/update-biolink.dto';

/** One row of the public directory (without the per-visitor liked/saved flags). */
interface DirectoryBiolinkItem {
  id: string;
  slug: string;
  fullName: string;
  jobTitle: string | null;
  company: string | null;
  bio: string | null;
  avatarUrl: string | null;
  logoUrl: string | null;
  primaryColor: string;
  template: string;
  publishedAt: Date | null;
  pinnedAt: Date;
  boostedUntil: Date | null;
  adDirectoryUntil: Date | null;
  likeCount: number;
}

/**
 * How long a rendered directory page may be served from cache. Short enough
 * that newly approved content appears almost immediately, long enough to
 * absorb the repeated queries of a traffic burst.
 */
const DIRECTORY_CACHE_TTL_MS = (() => {
  const parsed = Number(process.env.DIRECTORY_CACHE_TTL_MS ?? 15_000);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 15_000;
})();

@Injectable()
export class BiolinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityService,
    private readonly facetsCache: FacetsCacheService,
  ) {}

  private get appUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  }

  private async generateSlug(_fullName: string): Promise<string> {
    // Public biolinks use a fixed "90" prefix followed by a random 5-digit code,
    // e.g. 9068310.
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const slug = `90${Math.floor(10000 + Math.random() * 90000)}`;
      const existing = await this.prisma.biolink.findUnique({ where: { slug } });
      if (!existing) {
        return slug;
      }
    }
    throw new ConflictException('ساخت شناسه یکتای بیولینک ناموفق بود، دوباره تلاش کنید');
  }

  /**
   * Validates that `businessCardId` belongs to `userId` and is not already
   * linked to a *different* biolink (the relation is one-to-one). `selfId` is
   * the biolink being edited, so re-saving its own link is allowed.
   */
  private async assertLinkedBusinessCard(
    userId: string,
    businessCardId: string,
    selfId?: string,
  ) {
    const businessCard = await this.prisma.businessCard.findUnique({
      where: { id: businessCardId },
      select: { id: true, userId: true },
    });
    if (!businessCard || businessCard.userId !== userId) {
      throw new BadRequestException('کارت ویزیت انتخاب‌شده معتبر نیست');
    }
    const takenBy = await this.prisma.biolink.findFirst({
      where: { businessCardId, ...(selfId ? { id: { not: selfId } } : {}) },
      select: { id: true },
    });
    if (takenBy) {
      throw new ConflictException(
        'این کارت ویزیت قبلاً به یک بیولینک دیگر متصل شده است',
      );
    }
  }

  async create(userId: string, dto: CreateBiolinkDto) {
    // `draft` is a transport-only flag: it decides the initial status and
    // whether the moderators get pinged, and must never reach Prisma.
    const { draft, ...fields } = dto;
    // Global kill-switch: the admin can pause creation while load-testing.
    const locks = await this.settings.getCreationLocks();
    if (!locks.allowBiolinkCreation) {
      throw new ForbiddenException(
        'ساخت بیولینک موقتاً توسط مدیر غیرفعال شده است. لطفاً بعداً تلاش کنید.',
      );
    }
    // enforce the user's subscription quota before creating a new biolink
    await this.subscriptions.enforceNotExceeded(userId, 'biolink');
    if (dto.cityId) {
      const city = await this.prisma.city.findUnique({ where: { id: dto.cityId } });
      if (!city || !city.isActive) {
        throw new BadRequestException('شهر انتخاب‌شده معتبر نیست');
      }
    }
    if (dto.businessId) {
      const business = await this.prisma.businessCategory.findUnique({
        where: { id: dto.businessId },
      });
      if (!business || !business.isActive) {
        throw new BadRequestException('کسب‌وکار انتخاب‌شده معتبر نیست');
      }
    }
    // Optional link to one of the owner's own business cards. An empty string
    // (the "no link" option) is normalised to null so the form can also clear
    // an existing link.
    const businessCardId =
      dto.businessCardId === '' ? null : (dto.businessCardId ?? null);
    if (businessCardId) {
      await this.assertLinkedBusinessCard(userId, businessCardId);
    }
    const slug = await this.generateSlug(dto.fullName);
    const biolink = await this.prisma.biolink.create({
      data: {
        ...fields,
        businessCardId,
        slug,
        userId,
        status: draft ? BiolinkStatus.DRAFT : BiolinkStatus.PENDING,
        isPublished: false,
      },
    });

    // Drafts stay private: no moderation notification until the user sends
    // them for approval.
    if (!draft) {
      await this.notifications.notifyAdmins({
        category: 'BIOLINK',
        scope: 'BIOLINK',
        title: 'بیولینک جدید در انتظار تأیید',
        body: `بیولینک «${biolink.fullName}» برای بررسی ثبت شد.`,
        type: NotificationType.INFO,
        link: '/admin?section=biolinks',
        actorId: userId,
      });
    }

    await this.activity.log({
      action: draft ? 'BIOLINK_DRAFTED' : 'BIOLINK_CREATED',
      summary: draft
        ? `ذخیره پیش‌نویس بیولینک «${biolink.fullName}»`
        : `ساخت بیولینک «${biolink.fullName}»`,
      entityType: 'BIOLINK',
      entityId: biolink.id,
    });

    return biolink;
  }

  /**
   * The signed-in user's most recent unfinished draft, with the same shape as
   * `findMineById` (so the builder can prefill every field). Returns `null`
   * instead of throwing when there is no draft. The "new biolink" page uses
   * this to reopen a half-filled builder instead of starting blank.
   */
  async findLatestDraft(userId: string) {
    return this.prisma.biolink.findFirst({
      where: { userId, status: BiolinkStatus.DRAFT },
      orderBy: { updatedAt: 'desc' },
      include: {
        city: true,
        business: true,
        businessCard: { select: { id: true, slug: true, fullName: true } },
      },
    });
  }

  /**
   * The signed-in user's biolinks, paginated. The page size is the admin
   * controlled `myListPageSize` setting; `page` is 1-based.
   */
  async findMyBiolinks(userId: string, page = 1, limitOverride?: number) {
    const limit = limitOverride ?? (await this.settings.getMyListPageSize());
    const currentPage = Math.max(1, page);

    const [biolinks, total] = await Promise.all([
      this.prisma.biolink.findMany({
        where: { userId },
        include: {
          city: true,
          business: true,
          _count: { select: { likes: true, saves: true, scanEvents: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (currentPage - 1) * limit,
        take: limit,
      }),
      this.prisma.biolink.count({ where: { userId } }),
    ]);

    const targetIds = biolinks.map((item) => item.id);
    // latest boost/ad request per item so the table can show its request state
    const [requests, adRequests, ranks] = await Promise.all([
      this.prisma.boostRequest.findMany({
        where: {
          userId,
          kind: 'BIOLINK',
          targetId: { in: targetIds },
        },
        orderBy: { requestedAt: 'desc' },
      }),
      this.prisma.adRequest.findMany({
        where: {
          userId,
          kind: 'BIOLINK',
          targetId: { in: targetIds },
        },
        orderBy: { requestedAt: 'desc' },
      }),
      Promise.all(biolinks.map((item) => this.directoryRank(item.id))),
    ]);
    const requestByTarget = new Map<string, string>();
    for (const request of requests) {
      if (!requestByTarget.has(request.targetId)) {
        requestByTarget.set(request.targetId, request.status);
      }
    }
    const adByTarget = new Map<string, string>();
    for (const request of adRequests) {
      if (!adByTarget.has(request.targetId)) {
        adByTarget.set(request.targetId, request.status);
      }
    }

    return {
      items: biolinks.map((item, index) => ({
        ...item,
        likeCount: item._count.likes,
        saveCount: item._count.saves,
        views: item._count.scanEvents,
        boostStatus: requestByTarget.get(item.id) ?? null,
        adStatus: adByTarget.get(item.id) ?? null,
        rank: ranks[index],
      })),
      meta: this.paginationMeta(currentPage, limit, total),
    };
  }

  /** Shared pagination envelope for the user's own lists. */
  private paginationMeta(page: number, limit: number, total: number) {
    return {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };
  }

  async findMineById(userId: string, id: string) {
    const biolink = await this.prisma.biolink.findUnique({
      where: { id },
      include: {
        city: true,
        business: true,
        businessCard: { select: { id: true, slug: true, fullName: true } },
      },
    });
    if (!biolink) {
      throw new NotFoundException('بیولینک یافت نشد');
    }
    if (biolink.userId !== userId) {
      throw new ForbiddenException('دسترسی به این بیولینک مجاز نیست');
    }
    return biolink;
  }

  /**
   * The user's own business cards as compact options for the biolink form's
   * "link a business card" picker. `currentId` is the biolink being edited, so
   * the card already linked to it stays selectable; cards taken by other
   * biolinks are flagged as unselectable.
   */
  async linkableBusinessCards(userId: string, currentId?: string) {
    const rows = await this.prisma.businessCard.findMany({
      where: { userId },
      select: {
        id: true,
        slug: true,
        fullName: true,
        status: true,
        linkedBiolinks: { select: { id: true }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((row) => {
      const linkedBiolinkId = row.linkedBiolinks[0]?.id ?? null;
      return {
        id: row.id,
        slug: row.slug,
        fullName: row.fullName,
        status: row.status,
        linkedBiolinkId,
        selectable:
          linkedBiolinkId === null || linkedBiolinkId === (currentId ?? null),
      };
    });
  }

  async update(userId: string, id: string, dto: UpdateBiolinkDto) {
    const existing = await this.findMineById(userId, id);
    const { draft, ...fields } = dto;
    if (dto.cityId) {
      const city = await this.prisma.city.findUnique({ where: { id: dto.cityId } });
      if (!city || !city.isActive) {
        throw new BadRequestException('شهر انتخاب‌شده معتبر نیست');
      }
    }
    if (dto.businessId) {
      const business = await this.prisma.businessCategory.findUnique({
        where: { id: dto.businessId },
      });
      if (!business || !business.isActive) {
        throw new BadRequestException('کسب‌وکار انتخاب‌شده معتبر نیست');
      }
    }
    // `businessCardId` is handled separately so an empty string can detach the
    // link; `undefined` (field absent) leaves the existing link untouched.
    const linkProvided = dto.businessCardId !== undefined;
    const businessCardId = linkProvided
      ? dto.businessCardId === ''
        ? null
        : (dto.businessCardId ?? null)
      : undefined;
    if (businessCardId) {
      await this.assertLinkedBusinessCard(userId, businessCardId, id);
    }
    delete fields.businessCardId;
    // Saving a draft keeps the item private and does not re-enter moderation.
    // Any other edit re-enters the moderation queue (per PRD).
    const staysDraft = draft === true && existing.status === BiolinkStatus.DRAFT;
    const biolink = await this.prisma.biolink.update({
      where: { id },
      data: {
        ...fields,
        ...(linkProvided ? { businessCardId } : {}),
        ...(staysDraft
          ? { status: BiolinkStatus.DRAFT, isPublished: false }
          : {
              status: BiolinkStatus.PENDING,
              isPublished: false,
              rejectionReason: null,
              approvedAt: null,
              rejectedAt: null,
              publishedAt: null,
            }),
      },
    });

    if (!staysDraft) {
      await this.notifications.notifyAdmins({
        category: 'BIOLINK',
        scope: 'BIOLINK',
        title: 'ویرایش بیولینک در انتظار تأیید',
        body: `بیولینک «${biolink.fullName}» ویرایش شد و نیازمند بررسی مجدد است.`,
        type: NotificationType.WARNING,
        link: '/admin?section=biolinks',
        actorId: userId,
      });
    }

    await this.activity.log({
      action: staysDraft ? 'BIOLINK_DRAFTED' : 'BIOLINK_UPDATED',
      summary: staysDraft
        ? `ذخیره پیش‌نویس بیولینک «${biolink.fullName}»`
        : `ویرایش بیولینک «${biolink.fullName}»`,
      entityType: 'BIOLINK',
      entityId: biolink.id,
    });

    this.facetsCache.invalidateDirectory('biolink');
    return biolink;
  }

  async remove(userId: string, id: string) {
    const biolink = await this.findMineById(userId, id);
    await this.prisma.biolink.delete({ where: { id } });
    await this.activity.log({
      action: 'BIOLINK_DELETED',
      summary: `حذف بیولینک «${biolink.fullName}»`,
      entityType: 'BIOLINK',
      entityId: id,
    });
    this.facetsCache.invalidateDirectory('biolink');
    return { deleted: true };
  }

  /**
   * Publicly visible biolink by slug. Only approved + published biolinks are returned.
   */
  async findPublicBySlug(slug: string) {
    const biolink = await this.prisma.biolink.findFirst({
      where: { slug, status: BiolinkStatus.APPROVED, isPublished: true },
      include: {
        city: { select: { id: true, name: true } },
        business: { select: { id: true, name: true } },
        businessCard: {
          select: {
            id: true,
            slug: true,
            status: true,
            isPublished: true,
          },
        },
        user: { select: { plan: true } },
      },
    });
    if (!biolink) {
      throw new NotFoundException('بیولینک مورد نظر یافت نشد یا منتشر نشده است');
    }
    return this.projectPublicBiolink(biolink);
  }

  /**
   * Publicly visible biolinks for many slugs in a single round-trip.
   *
   * The directory pages use this to warm their detail panel: as soon as a page
   * of rows arrives, every row's full contact payload is fetched in one batch,
   * so clicking a row paints instantly instead of waiting for a per-item
   * request. Slugs that are unknown or not public are simply omitted.
   */
  async findPublicBySlugs(slugs: string[]) {
    const unique = [...new Set(slugs.filter(Boolean))];
    if (unique.length === 0) return [];
    const rows = await this.prisma.biolink.findMany({
      where: {
        slug: { in: unique },
        status: BiolinkStatus.APPROVED,
        isPublished: true,
      },
      include: {
        city: { select: { id: true, name: true } },
        business: { select: { id: true, name: true } },
        businessCard: {
          select: {
            id: true,
            slug: true,
            status: true,
            isPublished: true,
          },
        },
        user: { select: { plan: true } },
      },
    });
    return rows.map((row) => this.projectPublicBiolink(row));
  }

  /**
   * The most recently published biolinks, used by the home-page slider. A tiny
   * projection (no contact fields) so six cards cost almost nothing and the
   * home page never ships the whole directory payload.
   */
  async findLatestPublished(take = 6) {
    const rows = await this.prisma.biolink.findMany({
      where: { status: BiolinkStatus.APPROVED, isPublished: true },
      orderBy: [{ pinnedAt: 'desc' }, { id: 'desc' }],
      take,
      select: {
        id: true,
        slug: true,
        fullName: true,
        jobTitle: true,
        company: true,
        avatarUrl: true,
        logoUrl: true,
        publishedAt: true,
        city: { select: { id: true, name: true } },
        business: { select: { id: true, name: true } },
      },
    });
    return rows;
  }

  /**
   * Shapes one raw public biolink row into the payload the public page and the
   * directory detail panel expect: the owner's plan name as a badge, the linked
   * business card only when it is itself publicly visible, and the free-plan
   * field masking. Shared by the single and batch lookups above.
   */
  private projectPublicBiolink<
    T extends {
      website: string | null;
      linkedin: string | null;
      instagram: string | null;
      telegram: string | null;
      twitter: string | null;
      whatsapp: string | null;
      user?: {
        plan: {
          name: string;
          maxBiolinks: number;
          maxBusinessCards: number;
          showSocialLinks: boolean;
        } | null;
      } | null;
      businessCard?: {
        slug: string;
        status: BiolinkStatus;
        isPublished: boolean;
      } | null;
    },
  >(biolink: T) {
    // The owner's plan name is surfaced on the public page as a small badge,
    // while `planHidesFields` lets the owner's own view warn that a free plan
    // is masking links/socials instead of silently dropping them.
    const limits = planLimitsFrom(biolink.user?.plan);
    // Only expose the linked business card when it is itself publicly visible;
    // a link to a pending/unpublished card must not leak its slug.
    const linkedBusinessCard =
      biolink.businessCard &&
      biolink.businessCard.status === BiolinkStatus.APPROVED &&
      biolink.businessCard.isPublished
        ? {
            slug: biolink.businessCard.slug,
            link: this.linkedBusinessCardLink(biolink.businessCard.slug),
          }
        : null;
    const { user, businessCard: _businessCard, ...rest } =
      this.applyPlanVisibility(biolink);
    return {
      ...rest,
      planName: limits.name,
      planHidesFields: !limits.showSocialLinks,
      linkedBusinessCard,
    };
  }

  /** Public URL of a linked business card (used by the directory detail panel). */
  private linkedBusinessCardLink(slug: string): string {
    return `${this.appUrl.replace(/\/$/, '')}/business-cards/${slug}`;
  }

  /**
   * The free plan hides social links and the website field. When the owner has
   * no plan (fresh account) the free limits apply.
   */
  private applyPlanVisibility<T extends {
    website: string | null;
    linkedin: string | null;
    instagram: string | null;
    telegram: string | null;
    twitter: string | null;
    whatsapp: string | null;
    user?: { plan: { showSocialLinks: boolean } | null } | null;
  }>(biolink: T): T {
    const showLinks = biolink.user?.plan?.showSocialLinks ?? false;
    if (showLinks) {
      return biolink;
    }
    return {
      ...biolink,
      website: null,
      linkedin: null,
      instagram: null,
      telegram: null,
      twitter: null,
      whatsapp: null,
    };
  }

  /**
   * Public directory of published biolinks with search, filtering and pagination.
   */
  async findPublicDirectory(
    query: PublicBiolinkQueryDto,
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
      'dir:biolinks',
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
        ? this.prisma.biolinkLike
            .findMany({
              where: { visitorKey, biolinkId: { in: itemIds } },
              select: { biolinkId: true },
            })
            .then((rows) => new Set(rows.map((row) => row.biolinkId)))
        : Promise.resolve(new Set<string>()),
      userId
        ? this.prisma.biolinkSave
            .findMany({
              where: { userId, biolinkId: { in: itemIds } },
              select: { biolinkId: true },
            })
            .then((rows) => new Set(rows.map((row) => row.biolinkId)))
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
    query: PublicBiolinkQueryDto,
    limit: number,
  ): Promise<{ items: DirectoryBiolinkItem[]; total: number }> {
    const { page, q, cityId, businessId, sort } = query;

    const where: Prisma.BiolinkWhereInput = {
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
      avatarUrl: true,
      logoUrl: true,
      primaryColor: true,
      template: true,
      publishedAt: true,
      pinnedAt: true,
      boostedUntil: true,
      adDirectoryUntil: true,
      _count: { select: { likes: true } },
    } satisfies Prisma.BiolinkSelect;

    const pageSize = limit;
    const skip = (page - 1) * pageSize;

    // A paid directory ad only lifts an item when the visitor narrowed the list
    // down to the item's own city *and* business — see
    // `adDirectoryScopeMatches`. A boost («پله») is *not* scoped: it re-pins the
    // item (see boosts.service) so it tops the whole list, and automatically
    // drops down once a newer item is created.
    if (adDirectoryScopeMatches(cityId, businessId)) {
      const now = new Date();
      // Paid directory ads sit above the plain chronological rows. Each group is
      // fetched in its own order (enough rows to cover the requested page),
      // then concatenated and sliced — so the page straddles the group
      // boundaries cleanly. Boosts («پله») are part of the chronological rows:
      // their `pinnedAt` was reset on approval, so they are already the newest.
      const adWhere: Prisma.BiolinkWhereInput = {
        ...where,
        adDirectoryUntil: { gt: now },
      };
      const regularWhere: Prisma.BiolinkWhereInput = {
        AND: [
          where,
          { OR: [{ adDirectoryUntil: null }, { adDirectoryUntil: { lte: now } }] },
        ],
      };
      const take = pageSize + skip;
      const [adRows, regularRows, total] = await Promise.all([
        this.prisma.biolink.findMany({
          where: adWhere,
          select,
          orderBy: [{ adDirectoryUntil: 'desc' }, { id: 'desc' }],
          take,
        }),
        this.prisma.biolink.findMany({
          where: regularWhere,
          select,
          orderBy: biolinkOrderBy(sort),
          take,
        }),
        this.prisma.biolink.count({ where }),
      ]);

      const items = [...adRows, ...regularRows]
        .slice(skip, skip + pageSize)
        .map(({ _count, ...item }) => ({ ...item, likeCount: _count.likes }));
      return { items, total };
    }

    const [rows, total] = await Promise.all([
      this.prisma.biolink.findMany({
        where,
        select,
        orderBy: biolinkOrderBy(sort),
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.biolink.count({ where }),
    ]);

    // Outside the city+business slice a promotion must not advertise itself, so
    // the public row drops the paid-ad timestamp and the client shows no
    // «تبلیغات» tag. The «پله» timestamp is kept so the boosted row still shows
    // its badge while it sits at the top of the whole directory.
    const items = rows.map(({ _count, ...item }) => ({
      ...item,
      adDirectoryUntil: null,
      likeCount: _count.likes,
    }));
    return { items, total };
  }

  /**
   * Active cities/businesses that actually have a published biolink. Cached
   * briefly because it is identical across directory requests.
   */
  private getDirectoryFacets() {
    return this.facetsCache.get('biolinks:facets', async () => {
      const [cities, businesses] = await Promise.all([
        this.prisma.city.findMany({
          where: {
            isActive: true,
            biolinks: { some: { status: BiolinkStatus.APPROVED, isPublished: true } },
          },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        this.prisma.businessCategory.findMany({
          where: {
            isActive: true,
            biolinks: { some: { status: BiolinkStatus.APPROVED, isPublished: true } },
          },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
      ]);
      return { cities, businesses };
    });
  }

  async recordScan(
    biolinkId: string,
    meta: { ipHash?: string; userAgent?: string; referer?: string },
  ) {
    await this.prisma.scanEvent.create({
      data: {
        biolinkId,
        ipHash: meta.ipHash,
        userAgent: meta.userAgent?.slice(0, 500),
        referer: meta.referer?.slice(0, 500),
      },
    });
  }

  /**
   * Toggle a like from an anonymous visitor (identified by a hashed visitor
   * key). Returns the fresh like count for the biolink.
   */
  async toggleLike(slug: string, visitorKey: string) {
    const biolink = await this.findPublicBySlug(slug);
    const existing = await this.prisma.biolinkLike.findUnique({
      where: {
        biolinkId_visitorKey: { biolinkId: biolink.id, visitorKey },
      },
    });
    if (existing) {
      await this.prisma.biolinkLike.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.biolinkLike.create({
        data: { biolinkId: biolink.id, visitorKey },
      });
    }
    const likeCount = await this.prisma.biolinkLike.count({
      where: { biolinkId: biolink.id },
    });
    return { liked: !existing, likeCount };
  }

  async likeSummary(slug: string, visitorKey?: string) {
    const biolink = await this.findPublicBySlug(slug);
    const likeCount = await this.prisma.biolinkLike.count({
      where: { biolinkId: biolink.id },
    });
    const liked = visitorKey
      ? Boolean(
          await this.prisma.biolinkLike.findUnique({
            where: {
              biolinkId_visitorKey: { biolinkId: biolink.id, visitorKey },
            },
          }),
        )
      : false;
    return { likeCount, liked };
  }

  /**
   * Toggle a save ("ذخیره") for a logged-in user. Only authenticated users can
   * save, so a `userId` is always required here.
   */
  async toggleSave(slug: string, userId: string) {
    const biolink = await this.findPublicBySlug(slug);
    const existing = await this.prisma.biolinkSave.findUnique({
      where: { userId_biolinkId: { userId, biolinkId: biolink.id } },
    });
    if (existing) {
      await this.prisma.biolinkSave.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.biolinkSave.create({
        data: { userId, biolinkId: biolink.id },
      });
    }
    return { saved: !existing };
  }

  /**
   * Published biolinks a user has saved, newest save first, paginated with the
   * admin-controlled `myListPageSize` setting.
   */
  async findMySaved(userId: string, page = 1, limitOverride?: number) {
    const limit = limitOverride ?? (await this.settings.getMyListPageSize());
    const currentPage = Math.max(1, page);
    const [saves, total] = await Promise.all([
      this.prisma.biolinkSave.findMany({
        where: { userId },
        include: {
          biolink: {
            select: {
              id: true,
              slug: true,
              fullName: true,
              jobTitle: true,
              company: true,
              avatarUrl: true,
              primaryColor: true,
              template: true,
              _count: { select: { likes: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (currentPage - 1) * limit,
        take: limit,
      }),
      this.prisma.biolinkSave.count({ where: { userId } }),
    ]);
    return {
      items: saves
        .filter((save) => save.biolink)
        .map((save) => ({
          id: save.biolink.id,
          slug: save.biolink.slug,
          fullName: save.biolink.fullName,
          jobTitle: save.biolink.jobTitle,
          company: save.biolink.company,
          avatarUrl: save.biolink.avatarUrl,
          primaryColor: save.biolink.primaryColor,
          template: save.biolink.template,
          likeCount: save.biolink._count.likes,
          savedAt: save.createdAt,
        })),
      meta: this.paginationMeta(currentPage, limit, total),
    };
  }

  /**
   * 1-based rank of a biolink inside its published directory (ordered by the
   * default "newest" sort), plus the page it lands on with the current page
   * size. Used by the "افزایش بازدید" panel to show a position like 55 / page 3.
   */
  async directoryRank(biolinkId: string) {
    const biolink = await this.prisma.biolink.findUnique({
      where: { id: biolinkId },
      select: { id: true, pinnedAt: true, status: true, isPublished: true },
    });
    if (!biolink || biolink.status !== BiolinkStatus.APPROVED || !biolink.isPublished) {
      return { rank: null, page: null, total: null, pageSize: null };
    }
    const [total, pageSize, ahead] = await Promise.all([
      this.prisma.biolink.count({
        where: { status: BiolinkStatus.APPROVED, isPublished: true },
      }),
      this.settings.getDirectoryPageSize(),
      this.prisma.biolink.count({
        where: {
          status: BiolinkStatus.APPROVED,
          isPublished: true,
          OR: [
            { pinnedAt: { gt: biolink.pinnedAt } },
            { pinnedAt: biolink.pinnedAt, id: { gt: biolink.id } },
          ],
        },
      }),
    ]);
    const rank = ahead + 1;
    return {
      rank,
      page: Math.ceil(rank / pageSize),
      total,
      pageSize,
    };
  }

  async buildVCard(slug: string): Promise<string> {
    const biolink = await this.findPublicBySlug(slug);
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${biolink.fullName}`,
      biolink.company ? `ORG:${biolink.company}` : '',
      biolink.jobTitle ? `TITLE:${biolink.jobTitle}` : '',
      biolink.phone ? `TEL;TYPE=CELL:${biolink.phone}` : '',
      biolink.email ? `EMAIL:${biolink.email}` : '',
      biolink.website ? `URL:${biolink.website}` : '',
      biolink.address ? `ADR:;;${biolink.address};;;;` : '',
      biolink.bio ? `NOTE:${biolink.bio.replace(/\n/g, ' ')}` : '',
      'END:VCARD',
    ].filter(Boolean);
    return lines.join('\r\n');
  }

  async publicLink(slug: string): Promise<string> {
    return `${this.appUrl.replace(/\/$/, '')}/biolinks/${slug}`;
  }

  async qrDataUrl(slug: string): Promise<string> {
    const link = await this.publicLink(slug);
    return QRCode.toDataURL(link, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 512,
    });
  }

  async publicBiolinkWithAssets(slug: string) {
    const biolink = await this.findPublicBySlug(slug);
    const [qr, link] = await Promise.all([
      this.qrDataUrl(slug),
      this.publicLink(slug),
    ]);
    return { biolink, qr, link };
  }
}
