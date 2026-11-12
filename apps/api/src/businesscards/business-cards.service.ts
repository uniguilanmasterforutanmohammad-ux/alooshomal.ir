import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BiolinkStatus, NotificationType } from '@prisma/client';

import {
  orderedByAlpha,
} from '../common/directory-sort';
import { FacetsCacheService } from '../common/facets-cache.service';
import { applyPlanMask, planLimitsFrom } from '../common/plans';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityService } from '../activity/activity.service';
import { appUrl } from '../common/app-url';
import { paginationMeta } from '../common/pagination-meta';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { assertOwnedMediaUrls } from '../uploads/media-url';
import { WalletService } from '../wallet/wallet.service';
import { CreateBusinessCardDto } from './dto/create-business-card.dto';
import { PublicPhonebookQueryDto } from './dto/public-phonebook-query.dto';
import { UpdateBusinessCardDto } from './dto/update-business-card.dto';
import { sanitizeWorkingHours } from './working-hours';

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
    private readonly wallet: WalletService,
  ) {}

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
    await this.wallet.assertSettled(
      userId,
      'برای ساخت کارت ویزیت، ابتدا بدهی کیف پول خود را تسویه کنید.',
    );
    // `draft` is a transport-only flag: it decides the initial status and
    // whether the moderators get pinged, and must never reach Prisma.
    const { draft, workingHours: rawWorkingHours, ...fields } = dto;
    assertOwnedMediaUrls(
      [fields.avatarUrl, fields.logoUrl, ...(fields.gallery ?? [])],
      'تصویر کارت ویزیت',
    );
    const workingHours = sanitizeWorkingHours(rawWorkingHours);
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
          ...(workingHours !== undefined ? { workingHours } : {}),
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
    const owner = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { verifiedAt: true },
    });

    return {
      items: businessCards.map((item, index) => ({
        ...item,
        ownerVerified: Boolean(owner?.verifiedAt),
        likeCount: item._count.likes,
        saveCount: item._count.saves,
        views: item._count.scans,
        boostStatus: requestByTarget.get(item.id) ?? null,
        adStatus: adByTarget.get(item.id) ?? null,
        rank: ranks[index],
      })),
      meta: paginationMeta(currentPage, limit, total),
    };
  }

  /** Shared pagination envelope for the user's own lists. */
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
    const { draft, workingHours: rawWorkingHours, ...fields } = dto;
    assertOwnedMediaUrls(
      [fields.avatarUrl, fields.logoUrl, ...(fields.gallery ?? [])],
      'تصویر کارت ویزیت',
    );
    const workingHours = sanitizeWorkingHours(rawWorkingHours);
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
          ...(workingHours !== undefined ? { workingHours } : {}),
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
        user: { select: { plan: true, verifiedAt: true } },
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
        user: { select: { plan: true, verifiedAt: true } },
      },
    });
    return rows.map((row) => this.projectPublicBusinessCard(row));
  }

  /**
   * «شما صاحب این کسب‌وکار هستید؟» — a signed-in visitor takes ownership of a
   * system-imported profile (`isUnclaimed`). The card keeps its published state
   * so the directory never loses it; the new owner completes the remaining
   * details from the dashboard (and any edit re-enters moderation, as usual).
   */
  async claim(id: string, userId: string) {
    await this.settings.assertFeatureEnabled(
      'featureBusinessClaim',
      'تصاحب کسب‌وکارهای ثبت‌شده‌ی سیستمی موقتاً غیرفعال است.',
    );
    const card = await this.prisma.businessCard.findUnique({
      where: { id },
      select: { id: true, slug: true, fullName: true, userId: true, isUnclaimed: true },
    });
    if (!card) {
      throw new NotFoundException('کسب‌وکار مورد نظر یافت نشد');
    }
    if (card.userId === userId) {
      return { claimed: true, id: card.id, slug: card.slug };
    }
    if (!card.isUnclaimed) {
      throw new ConflictException('این کسب‌وکار قبلاً توسط صاحبش ثبت شده است');
    }
    await this.prisma.businessCard.update({
      where: { id },
      data: { userId, isUnclaimed: false },
    });
    await this.activity.log({
      action: 'BUSINESS_CARD_CLAIMED',
      summary: `تصاحب کسب‌وکار «${card.fullName}» توسط کاربر`,
      entityType: 'BUSINESS_CARD',
      entityId: card.id,
    });
    return { claimed: true, id: card.id, slug: card.slug };
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
        ratingAvg: true,
        ratingCount: true,
        city: { select: { id: true, name: true } },
        business: { select: { id: true, name: true } },
        user: { select: { plan: true, verifiedAt: true } },
      },
    });
    // Hide the fields the owner's plan masks (e.g. contact details on «رایگان»)
    // and drop the `user` relation from the public payload.
    return rows.map((row) => {
      const { user: _user, ...rest } = applyPlanMask(row, row.user?.plan);
      return { ...rest, ownerVerified: Boolean(row.user?.verifiedAt) };
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
        user: { select: { plan: true, verifiedAt: true } },
      },
      orderBy: [{ pinnedAt: 'desc' }, { id: 'desc' }],
      take: PHONEBOOK_MAX_ROWS,
    });

    const mapped = rows.map((row) => {
      const { user: _user, ...rest } = applyPlanMask(row, row.user?.plan);
      return { ...rest, ownerVerified: Boolean(row.user?.verifiedAt) };
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
        verifiedAt: Date | null;
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
    const { user: _user, linkedBiolinks: _linkedBiolinks, ...rest } =
      applyPlanMask(businessCard, businessCard.user?.plan);
    return {
      ...rest,
      planName: limits.name,
      ownerVerified: Boolean(businessCard.user?.verifiedAt),
      planHidesFields: limits.hiddenFields.length > 0,
      linkedBiolink,
    };
  }

  /** Public URL of a linked biolink (used by the directory detail panel). */
  private linkedBiolinkLink(slug: string): string {
    return `${appUrl().replace(/\/$/, '')}/biolinks/${slug}`;
  }

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
}
