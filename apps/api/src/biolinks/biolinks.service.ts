import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BiolinkStatus, NotificationType, Prisma } from '@prisma/client';
import * as QRCode from 'qrcode';

import { biolinkOrderBy } from '../common/directory-sort';
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

  async create(userId: string, dto: CreateBiolinkDto) {
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
    const slug = await this.generateSlug(dto.fullName);
    const biolink = await this.prisma.biolink.create({
      data: {
        ...dto,
        slug,
        userId,
        status: BiolinkStatus.PENDING,
        isPublished: false,
      },
    });

    await this.notifications.notifyAdmins({
      category: 'BIOLINK',
      title: 'بیولینک جدید در انتظار تأیید',
      body: `بیولینک «${biolink.fullName}» برای بررسی ثبت شد.`,
      type: NotificationType.INFO,
      link: '/admin?section=biolinks',
      actorId: userId,
    });

    await this.activity.log({
      action: 'BIOLINK_CREATED',
      summary: `ساخت بیولینک «${biolink.fullName}»`,
      entityType: 'BIOLINK',
      entityId: biolink.id,
    });

    return biolink;
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

    // latest boost request per item so the card can show its request state
    const [requests, ranks] = await Promise.all([
      this.prisma.boostRequest.findMany({
        where: {
          userId,
          kind: 'BIOLINK',
          targetId: { in: biolinks.map((item) => item.id) },
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

    return {
      items: biolinks.map((item, index) => ({
        ...item,
        likeCount: item._count.likes,
        saveCount: item._count.saves,
        views: item._count.scanEvents,
        boostStatus: requestByTarget.get(item.id) ?? null,
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
      include: { city: true, business: true },
    });
    if (!biolink) {
      throw new NotFoundException('بیولینک یافت نشد');
    }
    if (biolink.userId !== userId) {
      throw new ForbiddenException('دسترسی به این بیولینک مجاز نیست');
    }
    return biolink;
  }

  async update(userId: string, id: string, dto: UpdateBiolinkDto) {
    await this.findMineById(userId, id);
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
    // any edit re-enters the moderation queue (per PRD)
    const biolink = await this.prisma.biolink.update({
      where: { id },
      data: {
        ...dto,
        status: BiolinkStatus.PENDING,
        isPublished: false,
        rejectionReason: null,
        approvedAt: null,
        rejectedAt: null,
        publishedAt: null,
      },
    });

    await this.notifications.notifyAdmins({
      category: 'BIOLINK',
      title: 'ویرایش بیولینک در انتظار تأیید',
      body: `بیولینک «${biolink.fullName}» ویرایش شد و نیازمند بررسی مجدد است.`,
      type: NotificationType.WARNING,
      link: '/admin?section=biolinks',
      actorId: userId,
    });

    await this.activity.log({
      action: 'BIOLINK_UPDATED',
      summary: `ویرایش بیولینک «${biolink.fullName}»`,
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
        user: { select: { plan: true } },
      },
    });
    if (!biolink) {
      throw new NotFoundException('بیولینک مورد نظر یافت نشد یا منتشر نشده است');
    }
    // The owner's plan name is surfaced on the public page as a small badge.
    const planName = planLimitsFrom(biolink.user?.plan).name;
    const { user, ...rest } = this.applyPlanVisibility(biolink);
    return { ...rest, planName };
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

    const [rows, total] = await Promise.all([
      this.prisma.biolink.findMany({
        where,
        select: {
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
          _count: { select: { likes: true } },
        },
        orderBy: biolinkOrderBy(sort),
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.biolink.count({ where }),
    ]);

    const items = rows.map(({ _count, ...item }) => ({
      ...item,
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
