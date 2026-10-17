import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdTargetKind,
  BoostStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';

import { ActivityService } from '../activity/activity.service';
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
   * existing requests. Kept tiny so the dashboard page renders instantly.
   */
  async overview(userId: string) {
    const [businessCards, biolinks, requests, durationDays, dailySlots] =
      await Promise.all([
        this.prisma.businessCard.findMany({
          where: { userId },
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
        }),
        this.prisma.biolink.findMany({
          where: { userId },
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

    return {
      businessCards: businessCards.map(({ status, ...item }) => ({
        ...item,
        approved: status === 'APPROVED',
      })),
      biolinks: biolinks.map(({ status, ...item }) => ({
        ...item,
        approved: status === 'APPROVED',
      })),
      requests: requests.map((request) => ({
        ...request,
        target: labels.get(request.targetId) ?? null,
      })),
      settings: { durationDays, dailySlots },
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

    const existing = await this.prisma.adRequest.findFirst({
      where: {
        userId,
        kind: dto.kind,
        targetId: dto.targetId,
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
        note: dto.note ?? null,
      },
    });

    await this.notifications.notifyAdmins({
      category: 'AD',
      title: 'درخواست تبلیغ جدید',
      body: `درخواست تبلیغ «${target.fullName}» برای نمایش در صفحه اصلی ثبت شد.`,
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
   * The single active ad shown in the home-page box. Approved ads that have not
   * yet expired are rotated deterministically by day so each advertiser gets a
   * fair turn when the admin allows only one slot.
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
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        },
        orderBy: { decidedAt: 'desc' },
        take: 60,
      }),
      this.settings.getAdDailySlots(),
    ]);

    if (ads.length === 0) return null;

    // Stable per-day offset so the rotation is the same for every visitor on a
    // given day but changes at midnight.
    const dayIndex = Math.floor(now.getTime() / 86_400_000);
    const poolSize = Math.min(slots, 20);
    const chosen: typeof ads = [];
    for (let i = 0; i < Math.min(poolSize, ads.length); i += 1) {
      chosen.push(ads[(dayIndex + i) % ads.length]);
    }

    const labels = await this.targetLabels(chosen);
    const items = await Promise.all(
      chosen.map((ad) => this.publicAdPayload(ad, labels.get(ad.targetId) ?? null)),
    );
    return { items: items.filter((item) => item !== null) };
  }

  /** Admin list with the optional status filter. */
  async listRequests(status?: BoostStatus) {
    const where: Prisma.AdRequestWhereInput = status ? { status } : {};
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
    return requests.map((request) => ({
      ...request,
      target: labels.get(request.targetId) ?? null,
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
    const durationDays = await this.settings.getAdDurationDays();

    const updated = await this.prisma.adRequest.update({
      where: { id: requestId },
      data: {
        status: dto.status,
        decidedAt: now,
        decidedById: adminId,
        adminNote: dto.adminNote ?? null,
        startedAt: approved ? now : null,
        endsAt: approved
          ? new Date(now.getTime() + durationDays * 86_400_000)
          : null,
      },
    });

    const labels = await this.targetLabels([request]);
    const label = labels.get(request.targetId)?.fullName ?? 'مورد انتخابی';

    await this.notifications.notify({
      userId: request.userId,
      type: approved ? NotificationType.SUCCESS : NotificationType.WARNING,
      title: approved ? 'تبلیغ شما تأیید شد' : 'درخواست تبلیغ شما رد شد',
      body: approved
        ? `تبلیغ «${label}» به‌مدت ${durationDays.toLocaleString('fa-IR')} روز در صفحه اصلی نمایش داده می‌شود.`
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

    const [cards, biolinks] = await Promise.all([
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
    ]);
    const map = new Map<string, { id: string; fullName: string; slug: string }>();
    [...cards, ...biolinks].forEach((item) => map.set(item.id, item));
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
