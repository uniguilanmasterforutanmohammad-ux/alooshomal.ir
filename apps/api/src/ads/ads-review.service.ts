import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AdPlacement,
  AdTargetKind,
  BoostStatus,
  NotificationType,
  PaymentStatus,
  Prisma,
} from '@prisma/client';

import { ActivityService } from '../activity/activity.service';
import { scheduleAdWindow } from '../common/ad-scheduling';
import { FacetsCacheService } from '../common/facets-cache.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { WalletService } from '../wallet/wallet.service';
import {
  displayStateOf,
  resolveAdTargetLabels,
  reviewableWhere,
} from './ads-targets';
import { DecideAdDto } from './dto/decide-ad.dto';

/**
 * Admin-side review workflow for ad requests: the review lists/counts and the
 * approve/reject decision (scheduling the display window and notifying the
 * owner). Split out of `AdsService` to keep the public/user flows focused.
 */
@Injectable()
export class AdsReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityService,
    private readonly facetsCache: FacetsCacheService,
    private readonly settings: SettingsService,
    private readonly wallet: WalletService,
  ) {}



  /** Admin list with the optional status filter. */
  async listRequests(status?: BoostStatus, placement?: AdPlacement) {
    const where: Prisma.AdRequestWhereInput = {
      ...(status ? { status } : {}),
      ...(placement ? { placement } : {}),
      ...(status === BoostStatus.PENDING ? reviewableWhere() : {}),
    };
    const requests = await this.prisma.adRequest.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        decidedBy: { select: { id: true, email: true, fullName: true } },
        payment: true,
      },
      orderBy: { requestedAt: 'desc' },
      take: 200,
    });
    const labels = await resolveAdTargetLabels(this.prisma, requests);
    const now = new Date();
    return requests.map((request) => ({
      ...request,
      target: labels.get(request.targetId) ?? null,
      displayState: displayStateOf(request, now),
    }));
  }

  /** Paginated review queue scoped to the reviewer for decided rows. */
  async listRequestQueueByPlacement(params: {
    placement: AdPlacement;
    status?: BoostStatus;
    decidedById?: string;
    skip: number;
    take: number;
  }) {
    const { placement, status, decidedById, skip, take } = params;
    const where: Prisma.AdRequestWhereInput = {
      placement,
      ...(status ? { status } : {}),
      ...(status === BoostStatus.PENDING ? reviewableWhere() : {}),
      ...(decidedById && status && status !== BoostStatus.PENDING
        ? { decidedById }
        : {}),
    };
    const [requests, total] = await this.prisma.$transaction([
      this.prisma.adRequest.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, fullName: true } },
          decidedBy: { select: { id: true, email: true, fullName: true } },
          payment: true,
        },
        orderBy: { requestedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.adRequest.count({ where }),
    ]);
    const labels = await resolveAdTargetLabels(this.prisma, requests);
    const now = new Date();
    return {
      items: requests.map((request) => ({
        ...request,
        target: labels.get(request.targetId) ?? null,
        displayState: displayStateOf(request, now),
      })),
      total,
    };
  }

  /** Per-status counts for one reviewer, split by ad placement. */
  async requestQueueCounts(decidedById: string, placement?: AdPlacement) {
    const base: Prisma.AdRequestWhereInput = placement ? { placement } : {};
    const [pending, approved, rejected] = await this.prisma.$transaction([
      this.prisma.adRequest.count({
        where: { ...base, status: BoostStatus.PENDING, ...reviewableWhere() },
      }),
      this.prisma.adRequest.count({
        where: { ...base, status: BoostStatus.APPROVED, decidedById },
      }),
      this.prisma.adRequest.count({
        where: { ...base, status: BoostStatus.REJECTED, decidedById },
      }),
    ]);
    return { pending, approved, rejected };
  }

  /**
   * Admin decision. Approving stamps the display window
   * (`startedAt = now`, `endsAt = now + adDurationDays`).
   */
  async decide(adminId: string, requestId: string, dto: DecideAdDto) {
    const request = await this.prisma.adRequest.findUnique({
      where: { id: requestId },
      include: { payment: true },
    });
    if (!request) {
      throw new NotFoundException('درخواست تبلیغ یافت نشد');
    }
    if (request.status !== BoostStatus.PENDING) {
      throw new BadRequestException('این درخواست قبلاً بررسی شده است');
    }
    if (
      dto.status === BoostStatus.APPROVED &&
      request.payment &&
      request.payment.status !== PaymentStatus.PAID
    ) {
      throw new BadRequestException(
        'پرداخت این درخواست هنوز تأیید نشده است؛ تا تکمیل پرداخت امکان تأیید وجود ندارد',
      );
    }
    if (dto.status === BoostStatus.APPROVED) {
      await this.wallet.assertSettled(
        request.userId,
        'کاربر برای اعمال این تبلیغ باید ابتدا بدهی کیف پول خود را تسویه کند.',
      );
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

    const labels = await resolveAdTargetLabels(this.prisma, [request]);
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
}
