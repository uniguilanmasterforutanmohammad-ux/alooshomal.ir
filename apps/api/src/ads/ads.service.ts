import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdPlacement,
  AdTargetKind,
  BoostStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';

import { ActivityService } from '../activity/activity.service';
import { scheduleAdWindow } from '../common/ad-scheduling';
import { FacetsCacheService } from '../common/facets-cache.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CreateAdDto } from './dto/create-ad.dto';
import { DecideAdDto } from './dto/decide-ad.dto';

/** A resolvable ad target: one of the owner's own cards or biolinks. */
interface AdTarget {
  id: string;
  slug: string;
  fullName: string;
  jobTitle: string | null;
  company: string | null;
  isPublished: boolean;
}

/** Where an approved ad sits in its display window, for the user/admin panels. */
type AdDisplayState =
  | 'PENDING'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'REJECTED';

function displayStateOf(
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

@Injectable()
export class AdsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityService,
    private readonly facetsCache: FacetsCacheService,
    private readonly settings: SettingsService,
  ) {}

  /**
   * The user's own ads: the published items eligible to advertise plus their
   * existing requests. The card/biolink pick lists are paginated and searchable
   * so the page stays light and stays usable with hundreds of items.
   */
  async overview(userId: string, page = 1, q?: string) {
    const limit = await this.settings.getMyListPageSize();
    const currentPage = Math.max(1, page);
    const skip = (currentPage - 1) * limit;
    const search = q?.trim();

    const searchWhere = search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' as const } },
            { jobTitle: { contains: search, mode: 'insensitive' as const } },
            { company: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [
      businessCards,
      cardTotal,
      biolinks,
      biolinkTotal,
      feeds,
      feedTotal,
      requests,
      durationDays,
      dailySlots,
    ] = await Promise.all([
      this.prisma.businessCard.findMany({
        where: { userId, ...searchWhere },
        select: {
          id: true,
          slug: true,
          fullName: true,
          jobTitle: true,
          company: true,
          isPublished: true,
          status: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.businessCard.count({ where: { userId, ...searchWhere } }),
      this.prisma.biolink.findMany({
        where: { userId, ...searchWhere },
        select: {
          id: true,
          slug: true,
          fullName: true,
          jobTitle: true,
          company: true,
          isPublished: true,
          status: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.biolink.count({ where: { userId, ...searchWhere } }),
      this.prisma.feedPost.findMany({
        where: {
          userId,
          ...(search
            ? { body: { contains: search, mode: 'insensitive' as const } }
            : {}),
        },
        select: {
          id: true,
          body: true,
          images: true,
          isPublished: true,
          status: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.feedPost.count({
        where: {
          userId,
          ...(search
            ? { body: { contains: search, mode: 'insensitive' as const } }
            : {}),
        },
      }),
      this.prisma.adRequest.findMany({
        where: { userId },
        orderBy: { requestedAt: 'desc' },
        take: 50,
      }),
      this.settings.getAdDurationDays(),
      this.settings.getAdDailySlots(),
    ]);

    const labels = await this.targetLabels(requests);
    const now = new Date();

    return {
      businessCards: businessCards.map(({ status, ...item }) => ({
        ...item,
        approved: status === 'APPROVED',
      })),
      biolinks: biolinks.map(({ status, ...item }) => ({
        ...item,
        approved: status === 'APPROVED',
      })),
      feeds: feeds.map(({ status, body, ...item }) => ({
        ...item,
        fullName: body?.slice(0, 60) || '(پست تصویری)',
        approved: status === 'APPROVED',
      })),
      requests: requests.map((request) => ({
        ...request,
        target: labels.get(request.targetId) ?? null,
        displayState: displayStateOf(request, now),
      })),
      settings: { durationDays, dailySlots },
      meta: {
        page: currentPage,
        limit,
        biolinkTotal,
        cardTotal,
        biolinkTotalPages: Math.max(1, Math.ceil(biolinkTotal / limit)),
        cardTotalPages: Math.max(1, Math.ceil(cardTotal / limit)),
        feedTotal,
        feedTotalPages: Math.max(1, Math.ceil(feedTotal / limit)),
        hasNext:
          currentPage * limit < Math.max(biolinkTotal, cardTotal, feedTotal),
        hasPrev: currentPage > 1,
      },
    };
  }

  /** Create a pending ad request for one of the user's own published items. */
  async create(userId: string, dto: CreateAdDto) {
    const target = await this.findOwnedTarget(userId, dto.kind, dto.targetId);
    if (!target.isPublished) {
      throw new BadRequestException(
        'برای ثبت تبلیغ، کارت/بیولینک باید تأیید و منتشر شده باشد',
      );
    }
    const placement = dto.placement ?? AdPlacement.HOME;

    const existing = await this.prisma.adRequest.findFirst({
      where: {
        userId,
        kind: dto.kind,
        targetId: dto.targetId,
        placement,
        status: BoostStatus.PENDING,
      },
    });
    if (existing) {
      throw new ConflictException('برای این مورد یک درخواست تبلیغ در انتظار تأیید دارید');
    }

    const request = await this.prisma.adRequest.create({
      data: {
        userId,
        kind: dto.kind,
        targetId: dto.targetId,
        placement,
        note: dto.note ?? null,
      },
    });

    await this.notifications.notifyAdmins({
      category: 'AD',
      title:
        placement === AdPlacement.DIRECTORY
          ? 'درخواست تبلیغ در دایرکتوری جدید'
          : 'درخواست تبلیغ جدید',
      body:
        placement === AdPlacement.DIRECTORY
          ? `درخواست تبلیغ «${target.fullName}» برای نمایش در صدر دایرکتوری همان شهر/کسب‌وکار ثبت شد.`
          : `درخواست تبلیغ «${target.fullName}» برای نمایش در صفحه اصلی ثبت شد.`,
      type: NotificationType.INFO,
      link: '/admin?section=ads',
      actorId: userId,
    });

    await this.activity.log({
      action: 'AD_REQUESTED',
      summary: `ثبت درخواست تبلیغ «${target.fullName}»`,
      entityType: 'AD',
      entityId: request.id,
    });

    return request;
  }

  /**
   * The ad(s) shown in the home-page box right now: approved requests whose
   * scheduled window already started and has not expired. Queued ads (whose
   * `startedAt` is still in the future) stay hidden until their turn. At most
   * `adDailySlots` ads run in parallel; when more are live (e.g. legacy rows
   * created before scheduling) the ones closest to finishing are kept.
   */
  async activeAd() {
    // Cached for a few seconds (like the directory facets): the home page is the
    // hottest endpoint and the ad only changes when an admin approves one.
    return this.facetsCache.get('ads:active', () => this.computeActiveAd(), 30_000);
  }

  private async computeActiveAd() {
    const now = new Date();
    const [ads, slots] = await Promise.all([
      this.prisma.adRequest.findMany({
        where: {
          status: BoostStatus.APPROVED,
          // Only home-page ads go in the home-page box; directory ads live in
          // the directory slices instead.
          placement: AdPlacement.HOME,
          AND: [
            { OR: [{ startedAt: null }, { startedAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
          ],
        },
        orderBy: { endsAt: 'asc' },
        take: 20,
      }),
      this.settings.getAdDailySlots(),
    ]);

    if (ads.length === 0) return null;

    const chosen = ads.slice(0, Math.min(Math.max(1, slots), ads.length));

    const labels = await this.targetLabels(chosen);
    const items = await Promise.all(
      chosen.map((ad) => this.publicAdPayload(ad, labels.get(ad.targetId) ?? null)),
    );
    return { items: items.filter((item) => item !== null) };
  }

  /** Admin list with the optional status filter. */
  async listRequests(status?: BoostStatus, placement?: AdPlacement) {
    const where: Prisma.AdRequestWhereInput = {
      ...(status ? { status } : {}),
      ...(placement ? { placement } : {}),
    };
    const requests = await this.prisma.adRequest.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        decidedBy: { select: { id: true, email: true, fullName: true } },
      },
      orderBy: { requestedAt: 'desc' },
      take: 200,
    });
    const labels = await this.targetLabels(requests);
    const now = new Date();
    return requests.map((request) => ({
      ...request,
      target: labels.get(request.targetId) ?? null,
      displayState: displayStateOf(request, now),
    }));
  }

  /**
   * Admin decision. Approving stamps the display window
   * (`startedAt = now`, `endsAt = now + adDurationDays`).
   */
  async decide(adminId: string, requestId: string, dto: DecideAdDto) {
    const request = await this.prisma.adRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException('درخواست تبلیغ یافت نشد');
    }
    if (request.status !== BoostStatus.PENDING) {
      throw new BadRequestException('این درخواست قبلاً بررسی شده است');
    }

    const approved = dto.status === BoostStatus.APPROVED;
    const now = new Date();
    const isDirectory = request.placement === AdPlacement.DIRECTORY;
    const [durationDays, slots, directoryDurationDays] = await Promise.all([
      this.settings.getAdDurationDays(),
      this.settings.getAdDailySlots(),
      this.settings.getAdDirectoryDurationDays(),
    ]);

    // Directory ads are *not* queued in lanes: approving one lifts the target to
    // the top of its own city+business slice for `adDirectoryDurationDays`.
    // Home-page ads are queued: they run for `durationDays` in one of the
    // `slots` parallel lanes. When all lanes are busy the new ad is scheduled
    // to start automatically when the first lane frees up.
    let window: { startedAt: Date; endsAt: Date } | null = null;
    if (approved && isDirectory) {
      window = {
        startedAt: now,
        endsAt: new Date(now.getTime() + directoryDurationDays * 86_400_000),
      };
    } else if (approved) {
      const active = await this.prisma.adRequest.findMany({
        where: {
          status: BoostStatus.APPROVED,
          placement: AdPlacement.HOME,
          startedAt: { not: null },
          endsAt: { gt: now },
          id: { not: requestId },
        },
        select: { startedAt: true, endsAt: true },
      });
      window = scheduleAdWindow(
        now,
        active.map((ad) => ({
          startedAt: ad.startedAt as Date,
          endsAt: ad.endsAt as Date,
        })),
        slots,
        durationDays,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.adRequest.update({
        where: { id: requestId },
        data: {
          status: dto.status,
          decidedAt: now,
          decidedById: adminId,
          adminNote: dto.adminNote ?? null,
          startedAt: window?.startedAt ?? null,
          endsAt: window?.endsAt ?? null,
        },
      });
      if (approved && isDirectory && window) {
        // Stamp the target's `adDirectoryUntil` so the directory services can
        // pin it to the top of exactly its own city+business slice.
        if (request.kind === AdTargetKind.BIOLINK) {
          await tx.biolink.update({
            where: { id: request.targetId },
            data: { adDirectoryUntil: window.endsAt },
          });
        } else if (request.kind === AdTargetKind.BUSINESS_CARD) {
          await tx.businessCard.update({
            where: { id: request.targetId },
            data: { adDirectoryUntil: window.endsAt },
          });
        } else {
          await tx.feedPost.update({
            where: { id: request.targetId },
            data: { adDirectoryUntil: window.endsAt },
          });
        }
      }
      return saved;
    });

    const labels = await this.targetLabels([request]);
    const label = labels.get(request.targetId)?.fullName ?? 'مورد انتخابی';
    const queued =
      approved && window !== null && window.startedAt.getTime() > now.getTime();

    await this.notifications.notify({
      userId: request.userId,
      type: approved ? NotificationType.SUCCESS : NotificationType.WARNING,
      title: approved
        ? isDirectory
          ? 'تبلیغ در دایرکتوری شما تأیید شد'
          : 'تبلیغ شما تأیید شد'
        : 'درخواست تبلیغ شما رد شد',
      body: approved
        ? isDirectory && window
          ? `تبلیغ «${label}» تأیید شد و تا ${window.endsAt.toLocaleDateString('fa-IR')} در صدر دایرکتوری همان شهر/کسب‌وکار نمایش داده می‌شود.`
          : queued && window
            ? `تبلیغ «${label}» تأیید شد و از ${window.startedAt.toLocaleDateString('fa-IR')} تا ${window.endsAt.toLocaleDateString('fa-IR')} در صفحه اصلی نمایش داده می‌شود.`
            : `تبلیغ «${label}» به‌مدت ${durationDays.toLocaleString('fa-IR')} روز در صفحه اصلی نمایش داده می‌شود.`
        : `درخواست تبلیغ «${label}» رد شد.` +
          (dto.adminNote ? ` دلیل: ${dto.adminNote}` : ''),
      link: '/dashboard/ads',
      actorId: adminId,
    });

    await this.activity.log({
      action: approved ? 'AD_APPROVED' : 'AD_REJECTED',
      summary: `${approved ? 'تأیید' : 'رد'} تبلیغ «${label}»`,
      entityType: 'AD',
      entityId: requestId,
    });

    if (approved) {
      this.facetsCache.invalidate('ads:');
      if (isDirectory) {
        this.facetsCache.invalidate('dir:biolinks');
        this.facetsCache.invalidate('dir:businesscards');
        this.facetsCache.invalidate('dir:feeds');
      }
    }
    return updated;
  }

  // ------------------------------------------------------------------
  //  helpers
  // ------------------------------------------------------------------

  /** Batch-resolve the human-readable label of every requested target. */
  private async targetLabels(
    requests: Array<{ kind: AdTargetKind; targetId: string }>,
  ) {
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
        ? this.prisma.businessCard.findMany({
            where: { id: { in: cardIds } },
            select: { id: true, fullName: true, slug: true },
          })
        : Promise.resolve([]),
      biolinkIds.length
        ? this.prisma.biolink.findMany({
            where: { id: { in: biolinkIds } },
            select: { id: true, fullName: true, slug: true },
          })
        : Promise.resolve([]),
      feedIds.length
        ? this.prisma.feedPost.findMany({
            where: { id: { in: feedIds } },
            select: { id: true, body: true },
          })
        : Promise.resolve([]),
    ]);
    const map = new Map<string, { id: string; fullName: string; slug: string }>();
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

  /** Build the public payload for one approved ad (only if still published). */
  private async publicAdPayload(
    ad: { id: string; kind: AdTargetKind; targetId: string },
    label: { id: string; fullName: string; slug: string } | null,
  ) {
    if (!label) return null;
    if (ad.kind === AdTargetKind.BUSINESS_CARD) {
      const card = await this.prisma.businessCard.findFirst({
        where: { id: ad.targetId, isPublished: true },
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
          city: { select: { id: true, name: true } },
          business: { select: { id: true, name: true } },
        },
      });
    if (!card) return null;
      const { id: _cardId, ...rest } = card;
      return { ...rest, kind: ad.kind, id: ad.id, href: `/business-cards/${card.slug}` };
    }
    if (ad.kind === AdTargetKind.FEED) {
      const post = await this.prisma.feedPost.findFirst({
        where: { id: ad.targetId, isPublished: true },
        select: { id: true, body: true, images: true },
      });
      if (!post) return null;
      return {
        kind: ad.kind,
        id: ad.id,
        slug: post.id,
        fullName: post.body?.slice(0, 60) || 'پست فید',
        jobTitle: null,
        company: null,
        bio: post.body,
        avatarUrl: post.images[0] ?? null,
        logoUrl: null,
        primaryColor: '#f59e0b',
        href: `/feeds/${post.id}`,
      };
    }
    const biolink = await this.prisma.biolink.findFirst({
      where: { id: ad.targetId, isPublished: true },
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
        city: { select: { id: true, name: true } },
        business: { select: { id: true, name: true } },
      },
    });
    if (!biolink) return null;
    const { id: _biolinkId, ...rest } = biolink;
    return { ...rest, kind: ad.kind, id: ad.id, href: `/biolinks/${biolink.slug}` };
  }

  private async findOwnedTarget(
    userId: string,
    kind: AdTargetKind,
    targetId: string,
  ): Promise<AdTarget> {
    if (kind === AdTargetKind.BIOLINK) {
      const biolink = await this.prisma.biolink.findUnique({
        where: { id: targetId },
        select: {
          id: true,
          slug: true,
          fullName: true,
          jobTitle: true,
          company: true,
          isPublished: true,
          userId: true,
        },
      });
      if (!biolink) throw new NotFoundException('بیولینک یافت نشد');
      if (biolink.userId !== userId) {
        throw new ForbiddenException('دسترسی به این بیولینک مجاز نیست');
      }
      return biolink;
    }
    if (kind === AdTargetKind.FEED) {
      const post = await this.prisma.feedPost.findUnique({
        where: { id: targetId },
        select: {
          id: true,
          body: true,
          isPublished: true,
          userId: true,
        },
      });
      if (!post) throw new NotFoundException('پست فید یافت نشد');
      if (post.userId !== userId) {
        throw new ForbiddenException('دسترسی به این پست فید مجاز نیست');
      }
      return {
        id: post.id,
        slug: post.id,
        fullName: post.body?.slice(0, 60) || 'پست فید',
        jobTitle: null,
        company: null,
        isPublished: post.isPublished,
      };
    }
    const card = await this.prisma.businessCard.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        slug: true,
        fullName: true,
        jobTitle: true,
        company: true,
        isPublished: true,
        userId: true,
      },
    });
    if (!card) throw new NotFoundException('کارت ویزیت یافت نشد');
    if (card.userId !== userId) {
      throw new ForbiddenException('دسترسی به این کارت ویزیت مجاز نیست');
    }
    return card;
  }
}
