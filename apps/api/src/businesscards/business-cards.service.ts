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
  businessCardOrderBy,
  DIRECTORY_ALPHA_MAX_ROWS,
  orderedByAlpha,
} from '../common/directory-sort';
import { FacetsCacheService } from '../common/facets-cache.service';
import {
  applyContactFieldMask,
  applyHiddenFields,
  hiddenFieldsFrom,
  planLimitsFrom,
} from '../common/plans';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreateBusinessCardDto } from './dto/create-business-card.dto';
import { PublicBusinessCardQueryDto } from './dto/public-business-card-query.dto';
import { PublicPhonebookQueryDto } from './dto/public-phonebook-query.dto';
import { UpdateBusinessCardDto } from './dto/update-business-card.dto';

/** One row of the public directory (without the per-visitor liked/saved flags). */
interface DirectoryBusinessCardItem {
  id: string;
  slug: string;
  fullName: string;
  jobTitle: string | null;
  company: string | null;
  bio: string | null;
  phone: string | null;
  mobile: string | null;
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
}

const DIRECTORY_CACHE_TTL_MS = (() => {
  const parsed = Number(process.env.DIRECTORY_CACHE_TTL_MS ?? 15_000);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 15_000;
})();

/**
 * Upper bound on how many rows the public «دفترچه تلفن» considers for one
 * request. Rows are ordered in JS (Persian collation, which Postgres cannot do
 * with the database's `en_US.utf8` collation) so the whole candidate set is
 * pulled once and then sliced into the requested page; the cap keeps a runaway
 * directory from turning one request into an unbounded transfer.
 */
const PHONEBOOK_MAX_ROWS = 2_000;

/**
 * Normalizes a phonebook field for search: Persian/Arabic digits become ASCII
 * and separators are dropped, so «۰۹۱۲ ۳۴۵» matches «0912345» regardless of
 * which keyboard the visitor used.
 */
function normalizePhonebookText(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[\s-]/g, '')
    .toLowerCase();
}

@Injectable()
export class BusinessCardsService {
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
    // Public businessCards use a fixed "90" prefix followed by a random 5-digit code,
    // e.g. 9068310.
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const slug = `90${Math.floor(10000 + Math.random() * 90000)}`;
      const existing = await this.prisma.businessCard.findUnique({ where: { slug } });
      if (!existing) {
        return slug;
      }
    }
    throw new ConflictException('ساخت شناسه یکتای کارت ویزیت ناموفق بود، دوباره تلاش کنید');
  }

  /**
   * Validates that `biolinkId` belongs to `userId` and is not already linked to
   * a *different* business card. `selfId` is the business card being edited, so
   * re-saving its own link is allowed.
   */
  private async assertLinkableBiolink(
    userId: string,
    biolinkId: string,
    selfId?: string,
  ) {
    const biolink = await this.prisma.biolink.findUnique({
      where: { id: biolinkId },
      select: { id: true, userId: true, businessCardId: true },
    });
    if (!biolink || biolink.userId !== userId) {
      throw new BadRequestException('بیولینک انتخاب‌شده معتبر نیست');
    }
    if (biolink.businessCardId && biolink.businessCardId !== selfId) {
      throw new ConflictException(
        'این بیولینک قبلاً به یک کارت ویزیت دیگر متصل شده است',
      );
    }
  }

  async create(userId: string, dto: CreateBusinessCardDto) {
    // `draft` is a transport-only flag: it decides the initial status and
    // whether the moderators get pinged, and must never reach Prisma.
    const { draft, ...fields } = dto;
    // Global kill-switch: the admin can pause creation while load-testing.
    const locks = await this.settings.getCreationLocks();
    if (!locks.allowBusinessCardCreation) {
      throw new ForbiddenException(
        'ساخت کارت ویزیت موقتاً توسط مدیر غیرفعال شده است. لطفاً بعداً تلاش کنید.',
      );
    }
    // enforce the user's subscription quota before creating a new business card
    await this.subscriptions.enforceNotExceeded(userId, 'businessCard');
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
    // Optional link to one of the owner's own biolinks. The link itself lives on
    // the biolink row (one-to-one), so `biolinkId` is stripped from `fields`.
    const biolinkId = dto.biolinkId === '' ? null : (dto.biolinkId ?? null);
    delete fields.biolinkId;
    if (biolinkId) {
      await this.assertLinkableBiolink(userId, biolinkId);
    }
    const slug = await this.generateSlug(dto.fullName);
    const businessCard = await this.prisma.$transaction(async (tx) => {
      const created = await tx.businessCard.create({
        data: {
          ...fields,
          slug,
          userId,
          status: draft ? BiolinkStatus.DRAFT : BiolinkStatus.PENDING,
          isPublished: false,
        },
      });
      if (biolinkId) {
        await tx.biolink.update({
          where: { id: biolinkId },
          data: { businessCardId: created.id },
        });
      }
      return created;
    });

    // Drafts stay private: no moderation notification until the user sends
    // them for approval.
    if (!draft) {
      await this.notifications.notifyAdmins({
        category: 'BUSINESS_CARD',
        scope: 'BUSINESS_CARD',
        title: 'کارت ویزیت جدید در انتظار تأیید',
        body: `کارت ویزیت «${businessCard.fullName}» برای بررسی ثبت شد.`,
        type: NotificationType.INFO,
        link: '/admin?section=business-cards',
        actorId: userId,
      });
    }

    await this.activity.log({
      action: draft ? 'CARD_DRAFTED' : 'CARD_CREATED',
      summary: draft
        ? `ذخیره پیش‌نویس کارت ویزیت «${businessCard.fullName}»`
        : `ساخت کارت ویزیت «${businessCard.fullName}»`,
      entityType: 'BUSINESS_CARD',
      entityId: businessCard.id,
    });

    this.facetsCache.invalidateDirectory('businesscard');
    return businessCard;
  }

  /**
   * The signed-in user's most recent unfinished draft card, with the same
   * shape as `findMineById` so the builder can prefill every field. Returns
   * `null` when there is none. The "new card" page reopens it so a user can
   * finish a half-filled card.
   */
  async findLatestDraft(userId: string) {
    return this.prisma.businessCard.findFirst({
      where: { userId, status: BiolinkStatus.DRAFT },
      orderBy: { updatedAt: 'desc' },
      include: {
        city: true,
        business: true,
        linkedBiolinks: { select: { id: true, slug: true, fullName: true } },
      },
    });
  }

  /**
   * The signed-in user's business cards, paginated with the admin-controlled
   * `myListPageSize` setting; `page` is 1-based.
   */
  async findMyBusinessCards(userId: string, page = 1, limitOverride?: number) {
    const limit = limitOverride ?? (await this.settings.getMyListPageSize());
    const currentPage = Math.max(1, page);

    const [businessCards, total] = await Promise.all([
      this.prisma.businessCard.findMany({
        where: { userId },
        include: {
          city: true,
          business: true,
          _count: { select: { likes: true, saves: true, scans: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (currentPage - 1) * limit,
        take: limit,
      }),
      this.prisma.businessCard.count({ where: { userId } }),
    ]);

    const targetIds = businessCards.map((item) => item.id);
    const [requests, adRequests, ranks] = await Promise.all([
      this.prisma.boostRequest.findMany({
        where: {
          userId,
          kind: 'BUSINESS_CARD',
          targetId: { in: targetIds },
        },
        orderBy: { requestedAt: 'desc' },
      }),
      this.prisma.adRequest.findMany({
        where: {
          userId,
          kind: 'BUSINESS_CARD',
          targetId: { in: targetIds },
        },
        orderBy: { requestedAt: 'desc' },
      }),
      Promise.all(businessCards.map((item) => this.directoryRank(item.id))),
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
      items: businessCards.map((item, index) => ({
        ...item,
        likeCount: item._count.likes,
        saveCount: item._count.saves,
        views: item._count.scans,
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
    const businessCard = await this.prisma.businessCard.findUnique({
      where: { id },
      include: {
        city: true,
        business: true,
        linkedBiolinks: {
          select: { id: true, slug: true, fullName: true },
          take: 1,
        },
      },
    });
    if (!businessCard) {
      throw new NotFoundException('کارت ویزیت یافت نشد');
    }
    if (businessCard.userId !== userId) {
      throw new ForbiddenException('دسترسی به این کارت ویزیت مجاز نیست');
    }
    return businessCard;
  }

  /**
   * The user's own biolinks as compact options for the business-card form's
   * "link a biolink" picker. `currentId` is the business card being edited, so
   * the biolink already linked to it stays selectable; biolinks taken by other
   * cards are flagged as unselectable.
   */
  async linkableBiolinks(userId: string, currentId?: string) {
    const rows = await this.prisma.biolink.findMany({
      where: { userId },
      select: {
        id: true,
        slug: true,
        fullName: true,
        status: true,
        businessCardId: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      fullName: row.fullName,
      status: row.status,
      linkedBusinessCardId: row.businessCardId,
      selectable:
        row.businessCardId === null || row.businessCardId === (currentId ?? null),
    }));
  }

  async update(userId: string, id: string, dto: UpdateBusinessCardDto) {
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
    // Link handling: the relation lives on the biolink row, so we diff the
    // requested biolink against whichever biolink currently points at this card
    // and move the link accordingly. `undefined` leaves it untouched.
    const linkProvided = dto.biolinkId !== undefined;
    const biolinkId = linkProvided
      ? dto.biolinkId === ''
        ? null
        : (dto.biolinkId ?? null)
      : undefined;
    delete fields.biolinkId;
    const currentLink = await this.prisma.biolink.findFirst({
      where: { businessCardId: id },
      select: { id: true },
    });
    if (biolinkId) {
      await this.assertLinkableBiolink(userId, biolinkId, id);
    }
    // Saving a draft keeps the item private and does not re-enter moderation.
    // Any other edit re-enters the moderation queue (per PRD).
    const staysDraft = draft === true && existing.status === BiolinkStatus.DRAFT;
    const businessCard = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.businessCard.update({
        where: { id },
        data: {
          ...fields,
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
      if (linkProvided && currentLink?.id !== (biolinkId ?? null)) {
        if (currentLink) {
          await tx.biolink.update({
            where: { id: currentLink.id },
            data: { businessCardId: null },
          });
        }
        if (biolinkId) {
          await tx.biolink.update({
            where: { id: biolinkId },
            data: { businessCardId: id },
          });
        }
      }
      return updated;
    });

    if (!staysDraft) {
      await this.notifications.notifyAdmins({
        category: 'BUSINESS_CARD',
        scope: 'BUSINESS_CARD',
        title: 'ویرایش کارت ویزیت در انتظار تأیید',
        body: `کارت ویزیت «${businessCard.fullName}» ویرایش شد و نیازمند بررسی مجدد است.`,
        type: NotificationType.WARNING,
        link: '/admin?section=business-cards',
        actorId: userId,
      });
    }

    await this.activity.log({
      action: staysDraft ? 'CARD_DRAFTED' : 'CARD_UPDATED',
      summary: staysDraft
        ? `ذخیره پیش‌نویس کارت ویزیت «${businessCard.fullName}»`
        : `ویرایش کارت ویزیت «${businessCard.fullName}»`,
      entityType: 'BUSINESS_CARD',
      entityId: businessCard.id,
    });

    return businessCard;
  }

  async remove(userId: string, id: string) {
    const card = await this.findMineById(userId, id);
    await this.prisma.businessCard.delete({ where: { id } });
    await this.activity.log({
      action: 'CARD_DELETED',
      summary: `حذف کارت ویزیت «${card.fullName}»`,
      entityType: 'BUSINESS_CARD',
      entityId: id,
    });
    this.facetsCache.invalidateDirectory('businesscard');
    return { deleted: true };
  }

  /**
   * Publicly visible businessCard by slug. Only approved + published businessCards are returned.
   */
  async findPublicBySlug(slug: string) {
    const businessCard = await this.prisma.businessCard.findFirst({
      where: { slug, status: BiolinkStatus.APPROVED, isPublished: true },
      include: {
        city: { select: { id: true, name: true } },
        business: { select: { id: true, name: true } },
        linkedBiolinks: {
          select: {
            id: true,
            slug: true,
            status: true,
            isPublished: true,
          },
          take: 1,
        },
        user: { select: { plan: true } },
      },
    });
    if (!businessCard) {
      throw new NotFoundException('کارت ویزیت مورد نظر یافت نشد یا منتشر نشده است');
    }
    return this.projectPublicBusinessCard(businessCard);
  }

  /**
   * Publicly visible business cards for many slugs in a single round-trip.
   *
   * The directory pages use this to warm their detail panel: as soon as a page
   * of rows arrives, every row's full contact payload is fetched in one batch,
   * so clicking a row paints instantly instead of waiting for a per-card
   * request. Slugs that are unknown or not public are simply omitted.
   */
  async findPublicBySlugs(slugs: string[]) {
    const unique = [...new Set(slugs.filter(Boolean))];
    if (unique.length === 0) return [];
    const rows = await this.prisma.businessCard.findMany({
      where: {
        slug: { in: unique },
        status: BiolinkStatus.APPROVED,
        isPublished: true,
      },
      include: {
        city: { select: { id: true, name: true } },
        business: { select: { id: true, name: true } },
        linkedBiolinks: {
          select: {
            id: true,
            slug: true,
            status: true,
            isPublished: true,
          },
          take: 1,
        },
        user: { select: { plan: true } },
      },
    });
    return rows.map((row) => this.projectPublicBusinessCard(row));
  }

  /**
   * The most recently published business cards, used by the home-page slider.
   * The projection carries only the fields the slider cards show (name, role,
   * company, city, business and a contact line), so six cards stay cheap.
   */
  async findLatestPublished(take = 6) {
    const rows = await this.prisma.businessCard.findMany({
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
        primaryColor: true,
        mobile: true,
        phone: true,
        address: true,
        publishedAt: true,
        city: { select: { id: true, name: true } },
        business: { select: { id: true, name: true } },
        user: { select: { plan: true } },
      },
    });
    // Hide the fields the owner's plan masks (e.g. contact details on «رایگان»)
    // and drop the `user` relation from the public payload.
    return rows.map((row) => {
      const { user: _user, ...rest } = this.applyPlanVisibility(row);
      return rest;
    });
  }

  /**
   * Paginated contact list for the public «دفترچه تلفن» page.
   *
   * Only rows that actually carry a reachable number move out of the database —
   * a phonebook entry with no phone is useless — and only the contact fields the
   * list shows are selected.
   *
   * Ordering is done in JS with the `fa` collation: the database's default
   * `en_US.utf8` collation sorts Persian names by code point, which is not the
   * alphabetical order a Persian reader expects. The candidate set (capped at
   * `PHONEBOOK_MAX_ROWS`) is therefore read once, filtered, ordered and sliced
   * into the requested page. `alpha` (default) sorts by name, `recent` by the
   * newest publication; both use id as a stable tie-break.
   *
   * Like every other public projection the owner's plan mask is applied: a
   * free-plan card has its e-mail blanked here just as it is on its own page.
   */
  async findPublicPhonebook(query: PublicPhonebookQueryDto = new PublicPhonebookQueryDto()) {
    const limit = await this.settings.getDirectoryPageSize();
    const page = query.page ?? 1;
    const sort = query.sort ?? 'alpha';
    const needle = normalizePhonebookText(query.q ?? '');

    const rows = await this.prisma.businessCard.findMany({
      where: {
        status: BiolinkStatus.APPROVED,
        isPublished: true,
        OR: [{ phone: { not: null } }, { mobile: { not: null } }],
      },
      select: {
        id: true,
        slug: true,
        fullName: true,
        jobTitle: true,
        company: true,
        phone: true,
        mobile: true,
        email: true,
        whatsapp: true,
        website: true,
        address: true,
        avatarUrl: true,
        logoUrl: true,
        primaryColor: true,
        publishedAt: true,
        pinnedAt: true,
        city: { select: { id: true, name: true } },
        business: { select: { id: true, name: true } },
        user: { select: { plan: true } },
      },
      orderBy: [{ pinnedAt: 'desc' }, { id: 'desc' }],
      take: PHONEBOOK_MAX_ROWS,
    });

    const mapped = rows.map((row) => {
      const { user: _user, ...rest } = this.applyPlanVisibility(row);
      return rest;
    });

    const filtered = needle
      ? mapped.filter((row) =>
          [row.fullName, row.jobTitle, row.company, row.phone, row.mobile]
            .filter(Boolean)
            .some((value) => normalizePhonebookText(String(value)).includes(needle)),
        )
      : mapped;

    const ordered =
      sort === 'recent'
        ? filtered
        : orderedByAlpha(filtered);

    const total = ordered.length;
    const start = (page - 1) * limit;
    const items = ordered.slice(start, start + limit);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNext: start + items.length < total,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Shapes one raw public business-card row into the payload the public page
   * and the directory detail panel expect: the owner's plan name as a badge,
   * the linked biolink only when it is itself publicly visible, and the
   * free-plan field masking. Shared by the single and batch lookups above.
   */
  private projectPublicBusinessCard<
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
          hiddenFields: string[];
        } | null;
      } | null;
      linkedBiolinks?: Array<{
        slug: string;
        status: BiolinkStatus;
        isPublished: boolean;
      }>;
    },
  >(businessCard: T) {
    // The owner's plan name is surfaced on the public page as a small badge,
    // while `planHidesFields` lets the owner's own view warn that a free plan
    // is masking links/socials instead of silently dropping them.
    const limits = planLimitsFrom(businessCard.user?.plan);
    // Only expose the linked biolink when it is itself publicly visible.
    const linked = businessCard.linkedBiolinks?.[0];
    const linkedBiolink =
      linked && linked.status === BiolinkStatus.APPROVED && linked.isPublished
        ? {
            slug: linked.slug,
            link: this.linkedBiolinkLink(linked.slug),
          }
        : null;
    const { user, linkedBiolinks: _linkedBiolinks, ...rest } =
      this.applyPlanVisibility(businessCard);
    return {
      ...rest,
      planName: limits.name,
      planHidesFields: limits.hiddenFields.length > 0,
      linkedBiolink,
    };
  }

  /** Public URL of a linked biolink (used by the directory detail panel). */
  private linkedBiolinkLink(slug: string): string {
    return `${this.appUrl.replace(/\/$/, '')}/biolinks/${slug}`;
  }

  /**
   * The free plan hides social links and the website field. When the owner has
   * no plan (fresh account) the free limits apply.
   */
  private applyPlanVisibility<T extends {
    user?: { plan: { showSocialLinks: boolean; hiddenFields: string[] } | null } | null;
  }>(businessCard: T): T {
    // A plan masks exactly the field keys its admin disabled; the legacy
    // `showSocialLinks` flag is folded into that list by `hiddenFieldsFrom`.
    const hidden = hiddenFieldsFrom(businessCard.user?.plan);
    return applyContactFieldMask(
      businessCard as unknown as Record<string, unknown>,
      hidden,
    ) as T;
  }

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
      phone: true,
      mobile: true,
      avatarUrl: true,
      logoUrl: true,
      primaryColor: true,
      template: true,
      publishedAt: true,
      pinnedAt: true,
      boostedUntil: true,
      adDirectoryUntil: true,
      city: { select: { id: true, name: true } },
      business: { select: { id: true, name: true } },
      // The owner's plan decides which contact fields are masked on the public
      // row (a plan that hides «تلفن همراه / ثابت» nulls phone + mobile).
      user: { select: { plan: { select: { showSocialLinks: true, hiddenFields: true } } } },
      _count: { select: { likes: true } },
    } satisfies Prisma.BusinessCardSelect;

    type DirectoryRow = Prisma.BusinessCardGetPayload<{ select: typeof select }>;

    // Shape one raw row into the public directory item: derive `likeCount`, drop
    // the paid-ad timestamp outside the city+business slice (so the «تبلیغات»
    // badge cannot advertise itself), and apply the owner's plan mask.
    const project = (row: DirectoryRow, keepAdBadge: boolean) => {
      const { _count, user, ...item } = row;
      const masked = applyContactFieldMask(
        {
          ...item,
          adDirectoryUntil: keepAdBadge ? item.adDirectoryUntil : null,
          likeCount: _count.likes,
        },
        hiddenFieldsFrom(user?.plan),
      );
      return masked as unknown as DirectoryBusinessCardItem;
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
      return { cities, businesses };
    });
  }


  async recordScan(
    businessCardId: string,
    meta: { ipHash?: string; userAgent?: string; referer?: string },
  ) {
    await this.prisma.businessCardScanEvent.create({
      data: {
        businessCardId,
        ipHash: meta.ipHash,
        userAgent: meta.userAgent?.slice(0, 500),
        referer: meta.referer?.slice(0, 500),
      },
    });
  }

  async toggleLike(slug: string, visitorKey: string) {
    const businessCard = await this.findPublicBySlug(slug);
    const existing = await this.prisma.businessCardLike.findUnique({
      where: {
        businessCardId_visitorKey: {
          businessCardId: businessCard.id,
          visitorKey,
        },
      },
    });
    if (existing) {
      await this.prisma.businessCardLike.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.businessCardLike.create({
        data: { businessCardId: businessCard.id, visitorKey },
      });
    }
    const likeCount = await this.prisma.businessCardLike.count({
      where: { businessCardId: businessCard.id },
    });
    return { liked: !existing, likeCount };
  }

  async likeSummary(slug: string, visitorKey?: string) {
    const businessCard = await this.findPublicBySlug(slug);
    const likeCount = await this.prisma.businessCardLike.count({
      where: { businessCardId: businessCard.id },
    });
    const liked = visitorKey
      ? Boolean(
          await this.prisma.businessCardLike.findUnique({
            where: {
              businessCardId_visitorKey: {
                businessCardId: businessCard.id,
                visitorKey,
              },
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
    const businessCard = await this.findPublicBySlug(slug);
    const existing = await this.prisma.businessCardSave.findUnique({
      where: {
        userId_businessCardId: { userId, businessCardId: businessCard.id },
      },
    });
    if (existing) {
      await this.prisma.businessCardSave.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.businessCardSave.create({
        data: { userId, businessCardId: businessCard.id },
      });
    }
    return { saved: !existing };
  }

  /**
   * Whether the current visitor has saved this business card. Anonymous
   * visitors (no `userId`) always get `saved: false`, so the public page can
   * render the save button without requiring a login.
   */
  async saveSummary(slug: string, userId?: string) {
    if (!userId) return { saved: false };
    const businessCard = await this.findPublicBySlug(slug);
    const existing = await this.prisma.businessCardSave.findUnique({
      where: {
        userId_businessCardId: { userId, businessCardId: businessCard.id },
      },
    });
    return { saved: Boolean(existing) };
  }

  /**
   * Published business cards a user has saved, newest save first, paginated
   * with the admin-controlled `myListPageSize` setting.
   */
  async findMySaved(userId: string, page = 1, limitOverride?: number) {
    const limit = limitOverride ?? (await this.settings.getMyListPageSize());
    const currentPage = Math.max(1, page);
    const [saves, total] = await Promise.all([
      this.prisma.businessCardSave.findMany({
        where: { userId },
        include: {
          businessCard: {
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
      this.prisma.businessCardSave.count({ where: { userId } }),
    ]);
    return {
      items: saves.map((save) => ({
        id: save.businessCard.id,
        slug: save.businessCard.slug,
        fullName: save.businessCard.fullName,
        jobTitle: save.businessCard.jobTitle,
        company: save.businessCard.company,
        avatarUrl: save.businessCard.avatarUrl,
        primaryColor: save.businessCard.primaryColor,
        template: save.businessCard.template,
        likeCount: save.businessCard._count.likes,
        savedAt: save.createdAt,
      })),
      meta: this.paginationMeta(currentPage, limit, total),
    };
  }

  /**
   * 1-based rank of a business card inside its published directory (ordered by
   * the default "newest" sort), plus the page it lands on with the current page
   * size. Used by the "افزایش بازدید" panel to show a position like 55 / page 3.
   */
  async directoryRank(businessCardId: string) {
    const businessCard = await this.prisma.businessCard.findUnique({
      where: { id: businessCardId },
      select: { id: true, pinnedAt: true, status: true, isPublished: true },
    });
    if (
      !businessCard ||
      businessCard.status !== BiolinkStatus.APPROVED ||
      !businessCard.isPublished
    ) {
      return { rank: null, page: null, total: null, pageSize: null };
    }
    const [total, pageSize, ahead] = await Promise.all([
      this.prisma.businessCard.count({
        where: { status: BiolinkStatus.APPROVED, isPublished: true },
      }),
      this.settings.getDirectoryPageSize(),
      this.prisma.businessCard.count({
        where: {
          status: BiolinkStatus.APPROVED,
          isPublished: true,
          OR: [
            { pinnedAt: { gt: businessCard.pinnedAt } },
            { pinnedAt: businessCard.pinnedAt, id: { gt: businessCard.id } },
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
    const businessCard = await this.findPublicBySlug(slug);
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${businessCard.fullName}`,
      businessCard.company ? `ORG:${businessCard.company}` : '',
      businessCard.jobTitle ? `TITLE:${businessCard.jobTitle}` : '',
      businessCard.phone ? `TEL;TYPE=CELL:${businessCard.phone}` : '',
      businessCard.email ? `EMAIL:${businessCard.email}` : '',
      businessCard.website ? `URL:${businessCard.website}` : '',
      businessCard.address ? `ADR:;;${businessCard.address};;;;` : '',
      businessCard.bio ? `NOTE:${businessCard.bio.replace(/\n/g, ' ')}` : '',
      'END:VCARD',
    ].filter(Boolean);
    return lines.join('\r\n');
  }

  async publicLink(slug: string): Promise<string> {
    return `${this.appUrl.replace(/\/$/, '')}/business-cards/${slug}`;
  }

  async qrDataUrl(slug: string): Promise<string> {
    const link = await this.publicLink(slug);
    return QRCode.toDataURL(link, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 512,
    });
  }

  async publicBusinessCardWithAssets(slug: string) {
    const businessCard = await this.findPublicBySlug(slug);
    const [qr, link] = await Promise.all([
      this.qrDataUrl(slug),
      this.publicLink(slug),
    ]);
    return { businessCard, qr, link };
  }
}
