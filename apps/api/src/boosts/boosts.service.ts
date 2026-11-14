import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BoostStatus,
  BoostTargetKind,
  NotificationType,
  PaymentStatus,
  RequestPaymentTarget,
  WalletEntryKind,
} from '@prisma/client';

import { NotificationsService } from '../notifications/notifications.service';
import { ActivityService } from '../activity/activity.service';
import { FacetsCacheService } from '../common/facets-cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { BiolinksService } from '../biolinks/biolinks.service';
import { BusinessCardsService } from '../businesscards/business-cards.service';
import { FeedsDirectoryService } from '../feeds/feeds-directory.service';
import { SettingsService } from '../settings/settings.service';
import { WalletService } from '../wallet/wallet.service';
import {
  RequestPaymentsService,
  type RequestPaymentInfo,
} from '../request-payments/request-payments.service';
import { resolveBoostTargetLabels } from './boosts-targets';
import { CreateBoostDto } from './dto/create-boost.dto';

/**
 * Fallback boost duration when the admin setting cannot be read (the effective
 * value lives in `Setting.boostDurationDays`).
 */
export const BOOST_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Persian label for a boost target kind, used in notifications/logs. */
function boostKindLabel(kind: BoostTargetKind): string {
  if (kind === BoostTargetKind.BIOLINK) return 'بیولینک';
  if (kind === BoostTargetKind.FEED) return 'پست فید';
  return 'کارت ویزیت';
}

/**
 * Where an approved ad sits in its display window, mirrored from the ads
 * service so the user's merged «افزایش بازدید» panel can render the ad-request
 * history with the same Persian states.
 */
type AdDisplayState =
  | 'PENDING'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'REJECTED';

function adDisplayState(
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
export class BoostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly biolinks: BiolinksService,
    private readonly businessCards: BusinessCardsService,
    private readonly feeds: FeedsDirectoryService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityService,
    private readonly facetsCache: FacetsCacheService,
    private readonly settings: SettingsService,
    private readonly requestPayments: RequestPaymentsService,
    private readonly wallet: WalletService,
  ) {}

  /**
   * Overview for the user's "افزایش بازدید" (increase visits) dashboard page.
   * Each kind is paginated with the admin-controlled `myListPageSize` setting.
   */
  async overview(
    userId: string,
    page = 1,
    limitOverride?: number,
    q?: string,
  ) {
    const limit = limitOverride ?? (await this.settings.getMyListPageSize());
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
    const where = { userId, ...searchWhere };

    const feedSearchWhere = search ? { body: { contains: search, mode: 'insensitive' as const } } : {};
    // When the admin turns the feed feature off, the user's feed posts must not
    // be advertised here either (the «فیدها» tab disappears from the panel).
    const feedsEnabled = await this.settings.isFeatureEnabled('featureFeedPosts');

    const [biolinks, biolinkTotal, businessCards, cardTotal] = await Promise.all([
      this.prisma.biolink.findMany({
        where,
        select: {
          id: true,
          slug: true,
          fullName: true,
          status: true,
          isPublished: true,
          boostedUntil: true,
          adDirectoryUntil: true,
          _count: { select: { scanEvents: true, likes: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.biolink.count({ where }),
      this.prisma.businessCard.findMany({
        where,
        select: {
          id: true,
          slug: true,
          fullName: true,
          status: true,
          isPublished: true,
          boostedUntil: true,
          adDirectoryUntil: true,
          _count: { select: { scans: true, likes: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.businessCard.count({ where }),
    ]);

    const feeds = feedsEnabled
      ? await this.prisma.feedPost.findMany({
        where: { userId, ...feedSearchWhere },
        select: {
          id: true,
          body: true,
          images: true,
          status: true,
          isPublished: true,
          boostedUntil: true,
          adDirectoryUntil: true,
          _count: { select: { likes: true, saves: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      })
      : [];
    const feedTotal = feedsEnabled
      ? await this.prisma.feedPost.count({ where: { userId, ...feedSearchWhere } })
      : 0;

    // The request history must cover *every* item the user owns, not just the
    // rows on the current page. Filtering by page ids (as before) hid every
    // request whose item happened to sit on another page — so with thousands of
    // items the past boosts/ads looked as if they had been deleted. Fetch the
    // user's requests directly instead.
    const requests = await this.prisma.boostRequest.findMany({
      where: { userId },
      include: { payment: true },
      orderBy: { requestedAt: 'desc' },
      take: 300,
    });
    const adRequests = await this.prisma.adRequest.findMany({
      where: { userId },
      include: { payment: true },
      orderBy: { requestedAt: 'desc' },
      take: 300,
    });

    // Resolve a human-readable label for every request target so both the boost
    // and the ad history can name the item.
    const requestTargetLabels = await resolveBoostTargetLabels(this.prisma, [
      ...requests,
      ...adRequests,
    ]);

    const [biolinkRanks, cardRanks, feedRanks] = await Promise.all([
      Promise.all(biolinks.map((item) => this.biolinks.directoryRank(item.id))),
      Promise.all(
        businessCards.map((item) => this.businessCards.directoryRank(item.id)),
      ),
      Promise.all(feeds.map((item) => this.feeds.directoryRank(item.id))),
    ]);

    // latest *effective* (approved) boost per target, for "last pole" date
    const approvedByTarget = new Map<string, string>();
    for (const request of requests) {
      if (request.status === BoostStatus.APPROVED && request.decidedAt) {
        const key = `${request.kind}:${request.targetId}`;
        const current = approvedByTarget.get(key);
        if (!current || request.decidedAt.toISOString() > current) {
          approvedByTarget.set(key, request.decidedAt.toISOString());
        }
      }
    }
    // latest ad-request status per target (for the merged "تبلیغ" button)
    const adStatusByTarget = new Map<string, string>();
    const directoryAdStatusByTarget = new Map<string, string>();
    for (const request of adRequests) {
      const key = `${request.kind}:${request.targetId}`;
      if (request.placement === 'DIRECTORY') {
        if (!directoryAdStatusByTarget.has(key)) {
          directoryAdStatusByTarget.set(key, request.status);
        }
      } else if (!adStatusByTarget.has(key)) {
        adStatusByTarget.set(key, request.status);
      }
    }

    return {
      biolinks: biolinks.map((item, index) => ({
        ...item,
        views: item._count.scanEvents,
        likes: item._count.likes,
        rank: biolinkRanks[index],
        lastBoostedAt: approvedByTarget.get(`BIOLINK:${item.id}`) ?? null,
        adStatus: adStatusByTarget.get(`BIOLINK:${item.id}`) ?? null,
        directoryAdStatus:
          directoryAdStatusByTarget.get(`BIOLINK:${item.id}`) ?? null,
      })),
      businessCards: businessCards.map((item, index) => ({
        ...item,
        views: item._count.scans,
        likes: item._count.likes,
        rank: cardRanks[index],
        lastBoostedAt: approvedByTarget.get(`BUSINESS_CARD:${item.id}`) ?? null,
        adStatus: adStatusByTarget.get(`BUSINESS_CARD:${item.id}`) ?? null,
        directoryAdStatus:
          directoryAdStatusByTarget.get(`BUSINESS_CARD:${item.id}`) ?? null,
      })),
      feeds: feeds.map((item, index) => ({
        id: item.id,
        fullName: item.body?.slice(0, 60) || '(پست تصویری)',
        status: item.status,
        isPublished: item.isPublished,
        boostedUntil: item.boostedUntil,
        adDirectoryUntil: item.adDirectoryUntil,
        slug: item.id,
        views: 0,
        likes: item._count.likes,
        rank: feedRanks[index],
        lastBoostedAt: approvedByTarget.get(`FEED:${item.id}`) ?? null,
        adStatus: adStatusByTarget.get(`FEED:${item.id}`) ?? null,
        directoryAdStatus:
          directoryAdStatusByTarget.get(`FEED:${item.id}`) ?? null,
      })),
      requests: requests.map((request) => ({
        ...request,
        target: requestTargetLabels.get(request.targetId) ?? null,
        payment: RequestPaymentsService.toInfo(request.payment),
      })),
      adRequests: adRequests.map((request) => ({
        ...request,
        target: requestTargetLabels.get(request.targetId) ?? null,
        displayState: adDisplayState(request, new Date()),
        payment: RequestPaymentsService.toInfo(request.payment),
      })),
      meta: {
        page: currentPage,
        limit,
        biolinkTotal,
        biolinkTotalPages: Math.max(1, Math.ceil(biolinkTotal / limit)),
        cardTotal,
        cardTotalPages: Math.max(1, Math.ceil(cardTotal / limit)),
        feedTotal,
        feedTotalPages: Math.max(1, Math.ceil(feedTotal / limit)),
        hasNext:
          currentPage * limit < Math.max(biolinkTotal, cardTotal, feedTotal),
        hasPrev: currentPage > 1,
      },
    };
  }

  async create(userId: string, dto: CreateBoostDto) {
    // Admin off-switch for the whole «پله» request feature.
    await this.settings.assertFeatureEnabled(
      'featureBoostRequests',
      'ثبت درخواست پله موقتاً توسط مدیر غیرفعال شده است.',
    );
    const target = await this.findOwnedTarget(userId, dto.kind, dto.targetId);
    if (target.status !== 'APPROVED' || !target.isPublished) {
      throw new BadRequestException(
        'فقط کارت‌ها/بیولینک‌های تأییدشده و منتشرشده را می‌توان پله کرد',
      );
    }

    // With the payment gateway connected a «پله» is paid first, then reviewed.
    const price = await this.settings.getBoostPrice();
    const paymentRequired = this.requestPayments.isRequired(price);
    const walletEnabled = await this.settings.isFeatureEnabled('featureWallet');

    const pending = await this.prisma.boostRequest.findFirst({
      where: {
        userId,
        kind: dto.kind,
        targetId: dto.targetId,
        status: BoostStatus.PENDING,
      },
      include: { payment: true },
    });
    if (pending) {
      if (walletEnabled) {
        return {
          ...pending,
          payment: null,
          wallet: {
            charged: 0,
            balance: await this.wallet.balanceOf(userId),
          },
        };
      }
      // An unpaid attempt can be resumed from the gateway; a free or already
      // paid request is genuinely a duplicate.
      const resumable =
        paymentRequired &&
        pending.payment &&
        pending.payment.status !== PaymentStatus.PAID;
      if (!resumable) {
        throw new ConflictException('برای این مورد قبلاً درخواست پله ثبت شده است');
      }
      const payment = await this.startPayment(userId, pending.id, price);
      return { ...pending, payment };
    }

    const request = await this.prisma.boostRequest.create({
      data: {
        userId,
        kind: dto.kind,
        targetId: dto.targetId,
        feature: dto.feature ?? 'POLE',
        note: dto.note,
        status: BoostStatus.PENDING,
      },
    });

    let payment: RequestPaymentInfo | null = null;
    let walletCharge: { charged: number; balance: number } | null = null;
    if (walletEnabled) {
      const charged = await this.wallet.charge({
        userId,
        kind: WalletEntryKind.BOOST,
        amount: price,
        title: 'پله در صدر دایرکتوری',
        sourceType: 'BOOST_REQUEST',
        sourceId: request.id,
        idempotencyKey: `boost:${request.id}`,
      });
      walletCharge = {
        charged,
        balance: await this.wallet.balanceOf(userId),
      };
    } else {
      payment = paymentRequired
        ? await this.startPayment(userId, request.id, price)
        : null;
    }

    // With the wallet the request can be reviewed immediately; the admin
    // decision itself is blocked until the tab is settled.
    if (!payment) {
      await this.notifications.notifyAdmins({
        category: 'BOOST',
        scope: 'BOOST',
        title: 'درخواست پله جدید',
        body: `یک درخواست «پله» برای ${boostKindLabel(dto.kind)} ثبت شد.`,
        type: NotificationType.INFO,
        link: '/jga4rm8j?section=boosts',
        actorId: userId,
      });
    }

    await this.activity.log({
      action: 'BOOST_REQUESTED',
      summary: `درخواست پله برای ${boostKindLabel(dto.kind)}`,
      entityType: 'BOOST',
      entityId: request.id,
    });

    return { ...request, payment, wallet: walletCharge };
  }

  /** Open (or reopen) the PayPing order of one «پله» request. */
  private startPayment(
    userId: string,
    requestId: string,
    amount: number,
  ): Promise<RequestPaymentInfo | null> {
    return this.prisma.user
      .findUnique({
        where: { id: userId },
        select: { email: true, phone: true, fullName: true },
      })
      .then((payer) =>
        this.requestPayments.start({
          userId,
          target: RequestPaymentTarget.BOOST,
          requestId,
          amount,
          description: 'پله در صدر دایرکتوری — شمالی‌کارت',
          payerIdentity: payer?.phone ?? payer?.email ?? null,
          payerName: payer?.fullName ?? null,
        }),
      );
  }

  private async findOwnedTarget(
    userId: string,
    kind: BoostTargetKind,
    targetId: string,
  ) {
    if (kind === BoostTargetKind.BIOLINK) {
      const biolink = await this.prisma.biolink.findUnique({
        where: { id: targetId },
      });
      if (!biolink) throw new NotFoundException('بیولینک یافت نشد');
      if (biolink.userId !== userId) {
        throw new ForbiddenException('دسترسی به این بیولینک مجاز نیست');
      }
      return biolink;
    }
    if (kind === BoostTargetKind.FEED) {
      const post = await this.prisma.feedPost.findUnique({
        where: { id: targetId },
      });
      if (!post) throw new NotFoundException('پست فید یافت نشد');
      if (post.userId !== userId) {
        throw new ForbiddenException('دسترسی به این پست فید مجاز نیست');
      }
      return post;
    }
    const card = await this.prisma.businessCard.findUnique({
      where: { id: targetId },
    });
    if (!card) throw new NotFoundException('کارت ویزیت یافت نشد');
    if (card.userId !== userId) {
      throw new ForbiddenException('دسترسی به این کارت ویزیت مجاز نیست');
    }
    return card;
  }
}
