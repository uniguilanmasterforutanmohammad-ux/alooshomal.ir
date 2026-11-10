import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BoostStatus, BoostTargetKind, NotificationType, PaymentStatus, Prisma } from '@prisma/client';

import { ActivityService } from '../activity/activity.service';
import { FacetsCacheService } from '../common/facets-cache.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { WalletService } from '../wallet/wallet.service';
import { resolveBoostTargetLabels } from './boosts-targets';
import { DecideBoostDto } from './dto/decide-boost.dto';

/**
 * Only requests whose fee is settled (or that never needed one, i.e. the
 * gateway was off) may enter the admin review queue.
 */
function reviewableWhere(): Prisma.BoostRequestWhereInput {
  return {
    OR: [{ payment: null }, { payment: { status: PaymentStatus.PAID } }],
  };
}

/**
 * Admin-side review workflow for «پله» (boost) requests: the review
 * lists/counts and the approve/reject decision (re-pinning the target item and
 * notifying the owner). Split out of `BoostsService`.
 */
@Injectable()
export class BoostsReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityService,
    private readonly facetsCache: FacetsCacheService,
    private readonly settings: SettingsService,
    private readonly wallet: WalletService,
  ) {}

  async listRequests(status?: BoostStatus) {
    const where: Prisma.BoostRequestWhereInput = {
      ...(status ? { status } : {}),
      ...(status === BoostStatus.PENDING ? reviewableWhere() : {}),
    };
    const requests = await this.prisma.boostRequest.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        decidedBy: { select: { id: true, email: true, fullName: true } },
        payment: true,
      },
      orderBy: { requestedAt: 'desc' },
      take: 200,
    });
    return this.attachTargets(requests);
  }

  /** Paginated review queue scoped to the requesting reviewer for decided rows. */
  async listRequestQueue(params: {
    status?: BoostStatus;
    decidedById?: string;
    skip: number;
    take: number;
  }) {
    const { status, decidedById, skip, take } = params;
    const where: Prisma.BoostRequestWhereInput = {
      ...(status ? { status } : {}),
      ...(status === BoostStatus.PENDING ? reviewableWhere() : {}),
      ...(decidedById && status && status !== BoostStatus.PENDING
        ? { decidedById }
        : {}),
    };
    const [requests, total] = await this.prisma.$transaction([
      this.prisma.boostRequest.findMany({
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
      this.prisma.boostRequest.count({ where }),
    ]);
    return { items: await this.attachTargets(requests), total };
  }

  /** Per-status counts for the review-queue tabs. */
  async requestQueueCounts(decidedById: string) {
    const [pending, approved, rejected] = await this.prisma.$transaction([
      this.prisma.boostRequest.count({
        where: { status: BoostStatus.PENDING, ...reviewableWhere() },
      }),
      this.prisma.boostRequest.count({
        where: { status: BoostStatus.APPROVED, decidedById },
      }),
      this.prisma.boostRequest.count({
        where: { status: BoostStatus.REJECTED, decidedById },
      }),
    ]);
    return { pending, approved, rejected };
  }

  private async attachTargets<
    T extends { kind: BoostTargetKind; targetId: string },
  >(requests: T[]) {
    // Attach a human-readable label of the boosted item.
    const labels = await resolveBoostTargetLabels(this.prisma, requests);
    return requests.map((request) => ({
      ...request,
      target: labels.get(request.targetId) ?? null,
    }));
  }

  /**
   * Admin decision. Approving re-pins the item (`pinnedAt = now`) and sets
   * `boostedUntil` ("now + boostDurationDays"), so it rises to the top of the
   * whole directory as if it were brand-new — and then drops back down as soon
   * as a newer item is created.
   */
  async decide(adminId: string, requestId: string, dto: DecideBoostDto) {
    const request = await this.prisma.boostRequest.findUnique({
      where: { id: requestId },
      include: { payment: true },
    });
    if (!request) {
      throw new NotFoundException('درخواست پله یافت نشد');
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
        'کاربر برای اعمال این پله باید ابتدا بدهی کیف پول خود را تسویه کند.',
      );
    }

    const now = new Date();
    const approved = dto.status === BoostStatus.APPROVED;
    const durationMs =
      (await this.settings.getBoostDurationDays()) * 24 * 60 * 60 * 1000;

    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.boostRequest.update({
        where: { id: requestId },
        data: {
          status: dto.status,
          decidedAt: now,
          decidedById: adminId,
          adminNote: dto.adminNote ?? null,
        },
      });

      if (approved) {
        const boostedUntil = new Date(now.getTime() + durationMs);
        // Resetting `pinnedAt` pushes the item back to the top of the directory
        // by "newness" — exactly like a freshly created item. It stays there
        // only until a newer item appears (then it falls to rank 2), and the
        // active `boostedUntil` drives the «پله» tag in the UI.
        if (request.kind === BoostTargetKind.BIOLINK) {
          await tx.biolink.update({
            where: { id: request.targetId },
            data: { boostedUntil, pinnedAt: now },
          });
        } else if (request.kind === BoostTargetKind.BUSINESS_CARD) {
          await tx.businessCard.update({
            where: { id: request.targetId },
            data: { boostedUntil, pinnedAt: now },
          });
        } else {
          await tx.feedPost.update({
            where: { id: request.targetId },
            data: { boostedUntil, pinnedAt: now },
          });
        }
      }

      return updated;
    });

    await this.notifications.notify({
      userId: request.userId,
      type: approved ? NotificationType.SUCCESS : NotificationType.WARNING,
      title: approved ? 'درخواست پله تأیید شد' : 'درخواست پله رد شد',
      body: approved
        ? 'کارت/بیولینک شما به صدر لیست دایرکتوری منتقل شد.'
        : 'درخواست پله شما رد شد.' + (dto.adminNote ? ` دلیل: ${dto.adminNote}` : ''),
      link: '/dashboard/boost',
      actorId: adminId,
    });

    await this.activity.log({
      action: approved ? 'BOOST_APPROVED' : 'BOOST_REJECTED',
      summary: `${approved ? 'تأیید' : 'رد'} درخواست پله توسط مدیر`,
      entityType: 'BOOST',
      entityId: requestId,
    });

    if (approved) {
      this.facetsCache.invalidateDirectory(
        request.kind === BoostTargetKind.BIOLINK
          ? 'biolink'
          : request.kind === BoostTargetKind.FEED
            ? 'feed'
            : 'businesscard',
      );
    }
    return updated;
  }
}
