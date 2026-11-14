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
  PaymentStatus,
  RequestPaymentTarget,
  WalletEntryKind,
} from '@prisma/client';

import { ActivityService } from '../activity/activity.service';
import { FacetsCacheService } from '../common/facets-cache.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  RequestPaymentsService,
  type RequestPaymentInfo,
} from '../request-payments/request-payments.service';
import { SettingsService } from '../settings/settings.service';
import { WalletService } from '../wallet/wallet.service';
import { displayStateOf, resolveAdTargetLabels } from './ads-targets';
import { CreateAdDto } from './dto/create-ad.dto';

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
    private readonly requestPayments: RequestPaymentsService,
    private readonly wallet: WalletService,
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
        include: { payment: true },
        orderBy: { requestedAt: 'desc' },
        take: 50,
      }),
      this.settings.getAdDurationDays(),
      this.settings.getAdDailySlots(),
    ]);

    const labels = await resolveAdTargetLabels(this.prisma, requests);
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
        payment: RequestPaymentsService.toInfo(request.payment),
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
    // Two separate admin switches: the home-page ad box and the paid
    // «تبلیغ در دایرکتوری» (top of the directory list).
    const placement = dto.placement ?? AdPlacement.HOME;
    await this.settings.assertFeatureEnabled(
      placement === AdPlacement.DIRECTORY
        ? 'featureAdDirectoryRequests'
        : 'featureAdRequests',
      placement === AdPlacement.DIRECTORY
        ? 'ثبت تبلیغ در صدر دایرکتوری موقتاً توسط مدیر غیرفعال شده است.'
        : 'ثبت درخواست تبلیغ موقتاً توسط مدیر غیرفعال شده است.',
    );
    const target = await this.findOwnedTarget(userId, dto.kind, dto.targetId);
    if (!target.isPublished) {
      throw new BadRequestException(
        'برای ثبت تبلیغ، کارت/بیولینک باید تأیید و منتشر شده باشد',
      );
    }

    // With the payment gateway connected the ad fee is collected first and the
    // request reaches the admin review queue only after payment.
    const price =
      placement === AdPlacement.DIRECTORY
        ? await this.settings.getAdDirectoryPrice()
        : await this.settings.getAdHomePrice();
    const paymentRequired = this.requestPayments.isRequired(price);
    const walletEnabled = await this.settings.isFeatureEnabled('featureWallet');

    const existing = await this.prisma.adRequest.findFirst({
      where: {
        userId,
        kind: dto.kind,
        targetId: dto.targetId,
        placement,
        status: BoostStatus.PENDING,
      },
      include: { payment: true },
    });
    if (existing) {
      if (walletEnabled) {
        return {
          ...existing,
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
        existing.payment &&
        existing.payment.status !== PaymentStatus.PAID;
      if (!resumable) {
        throw new ConflictException('برای این مورد یک درخواست تبلیغ در انتظار تأیید دارید');
      }
      const payment = await this.startPayment(
        userId,
        existing.id,
        placement,
        price,
      );
      return { ...existing, payment };
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

    let payment: RequestPaymentInfo | null = null;
    let walletCharge: { charged: number; balance: number } | null = null;
    if (walletEnabled) {
      const charged = await this.wallet.charge({
        userId,
        kind:
          placement === AdPlacement.DIRECTORY
            ? WalletEntryKind.AD_DIRECTORY
            : WalletEntryKind.AD_HOME,
        amount: price,
        title:
          placement === AdPlacement.DIRECTORY
            ? 'تبلیغ در صدر دایرکتوری'
            : 'تبلیغ در صفحه اصلی',
        sourceType: 'AD_REQUEST',
        sourceId: request.id,
        idempotencyKey: `ad:${request.id}`,
      });
      walletCharge = {
        charged,
        balance: await this.wallet.balanceOf(userId),
      };
    } else {
      payment = paymentRequired
        ? await this.startPayment(userId, request.id, placement, price)
        : null;
    }

    // With the wallet the request can be reviewed immediately; the admin
    // decision itself is blocked until the tab is settled.
    if (!payment) {
      await this.notifications.notifyAdmins({
        category: 'AD',
        scope: placement === AdPlacement.DIRECTORY ? 'DIRECTORY_AD' : 'AD',
        title:
          placement === AdPlacement.DIRECTORY
            ? 'درخواست تبلیغ در دایرکتوری جدید'
            : 'درخواست تبلیغ جدید',
        body:
          placement === AdPlacement.DIRECTORY
            ? `درخواست تبلیغ «${target.fullName}» برای نمایش در صدر دایرکتوری همان شهر/کسب‌وکار ثبت شد.`
            : `درخواست تبلیغ «${target.fullName}» برای نمایش در صفحه اصلی ثبت شد.`,
        type: NotificationType.INFO,
        link:
          placement === AdPlacement.DIRECTORY
            ? '/jga4rm8j?section=ads&placement=directory'
            : '/jga4rm8j?section=ads',
        actorId: userId,
      });
    }

    await this.activity.log({
      action: 'AD_REQUESTED',
      summary: `ثبت درخواست تبلیغ «${target.fullName}»`,
      entityType: 'AD',
      entityId: request.id,
    });

    return { ...request, payment, wallet: walletCharge };
  }

  /** Open (or reopen) the PayPing order of one ad request. */
  private startPayment(
    userId: string,
    requestId: string,
    placement: AdPlacement,
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
          target:
            placement === AdPlacement.DIRECTORY
              ? RequestPaymentTarget.AD_DIRECTORY
              : RequestPaymentTarget.AD_HOME,
          requestId,
          amount,
          description:
            placement === AdPlacement.DIRECTORY
              ? 'تبلیغ در صدر دایرکتوری — شمالی‌کارت'
              : 'تبلیغ در صفحه اصلی — شمالی‌کارت',
          payerIdentity: payer?.phone ?? payer?.email ?? null,
          payerName: payer?.fullName ?? null,
        }),
      );
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

    const labels = await resolveAdTargetLabels(this.prisma, chosen);
    const items = await Promise.all(
      chosen.map((ad) => this.publicAdPayload(ad, labels.get(ad.targetId) ?? null)),
    );
    return { items: items.filter((item) => item !== null) };
  }

  // ------------------------------------------------------------------
  //  helpers
  // ------------------------------------------------------------------

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
