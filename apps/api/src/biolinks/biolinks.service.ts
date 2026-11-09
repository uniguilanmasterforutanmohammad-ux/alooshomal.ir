import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BiolinkStatus, NotificationType } from '@prisma/client';

import { FacetsCacheService } from '../common/facets-cache.service';
import { applyPlanMask, planLimitsFrom } from '../common/plans';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityService } from '../activity/activity.service';
import { appUrl } from '../common/app-url';
import { paginationMeta } from '../common/pagination-meta';
import { PrismaService } from '../prisma/prisma.service';
import {
  BIOLINK_TEMPLATE_KEYS,
  LEGACY_TEMPLATE_KEYS,
  SettingsService,
} from '../settings/settings.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { assertOwnedMediaUrls } from '../uploads/media-url';
import { CreateBiolinkDto } from './dto/create-biolink.dto';
import { UpdateBiolinkDto } from './dto/update-biolink.dto';

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
    this.sanitizeTemplateFields(fields);
    assertOwnedMediaUrls([fields.avatarUrl, fields.logoUrl], 'تصویر بیولینک');
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
      meta: paginationMeta(currentPage, limit, total),
    };
  }

  /** Shared pagination envelope for the user's own lists. */
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
    this.sanitizeTemplateFields(fields);
    assertOwnedMediaUrls([fields.avatarUrl, fields.logoUrl], 'تصویر بیولینک');
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

  /**
   * Drops an unknown display-mode key so a stale/legacy payload can never store
   * a value the public page does not know how to render. The classic «رکورد»
   * key is always allowed; every other key must be a known design. Legacy keys
   * (e.g. «classic», «vintage») are normalised to the classic record so old
   * builders keep working.
   */
  private sanitizeTemplateFields(fields: Record<string, unknown>): void {
    if (fields.template === undefined) return;
    const known = BIOLINK_TEMPLATE_KEYS as readonly string[];
    const value = fields.template;
    if (value === 'record') return;
    if (typeof value === 'string' && known.includes(value)) return;
    if (typeof value === 'string' && LEGACY_TEMPLATE_KEYS.includes(value)) {
      fields.template = 'record';
      return;
    }
    delete fields.template;
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
        user: { select: { plan: true, verifiedAt: true } },
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
        user: { select: { plan: true, verifiedAt: true } },
      },
    });
    return rows.map((row) => this.projectPublicBiolink(row));
  }

  /**
   * The most recently published biolinks, used by the home-page slider. The
   * projection carries only the fields the slider cards show (name, role,
   * company, city, business and a contact line), so six cards stay cheap.
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
        primaryColor: true,
        mobile: true,
        phone: true,
        address: true,
        publishedAt: true,
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
        verifiedAt: Date | null;
        plan: {
          name: string;
          maxBiolinks: number;
          maxBusinessCards: number;
          showSocialLinks: boolean;
          hiddenFields: string[];
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
    // while `planHidesFields` lets the owner's own view warn that their plan
    // is masking fields instead of silently dropping them.
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
    const { user: _user, businessCard: _businessCard, ...rest } =
      applyPlanMask(biolink, biolink.user?.plan);
    return {
      ...rest,
      planName: limits.name,
      ownerVerified: Boolean(biolink.user?.verifiedAt),
      planHidesFields: limits.hiddenFields.length > 0,
      linkedBusinessCard,
    };
  }

  /** Public URL of a linked business card (used by the directory detail panel). */
  private linkedBusinessCardLink(slug: string): string {
    return `${appUrl().replace(/\/$/, '')}/business-cards/${slug}`;
  }

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
}
