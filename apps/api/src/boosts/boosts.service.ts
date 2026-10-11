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
  Prisma,
} from '@prisma/client';

import { NotificationsService } from '../notifications/notifications.service';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { BiolinksService } from '../biolinks/biolinks.service';
import { BusinessCardsService } from '../businesscards/business-cards.service';
import { CreateBoostDto } from './dto/create-boost.dto';
import { DecideBoostDto } from './dto/decide-boost.dto';

/** How long an approved boost keeps an item pinned near the top of its directory. */
export const BOOST_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

@Injectable()
export class BoostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly biolinks: BiolinksService,
    private readonly businessCards: BusinessCardsService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityService,
  ) {}

  /** Overview for the user's "افزایش بازدید" (increase visits) dashboard page. */
  async overview(userId: string) {
    const [biolinks, businessCards, requests] = await Promise.all([
      this.prisma.biolink.findMany({
        where: { userId },
        select: {
          id: true,
          slug: true,
          fullName: true,
          status: true,
          isPublished: true,
          boostedUntil: true,
          _count: { select: { scanEvents: true, likes: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.businessCard.findMany({
        where: { userId },
        select: {
          id: true,
          slug: true,
          fullName: true,
          status: true,
          isPublished: true,
          boostedUntil: true,
          _count: { select: { scans: true, likes: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.boostRequest.findMany({
        where: { userId },
        orderBy: { requestedAt: 'desc' },
        take: 50,
      }),
    ]);

    const [biolinkRanks, cardRanks] = await Promise.all([
      Promise.all(biolinks.map((item) => this.biolinks.directoryRank(item.id))),
      Promise.all(
        businessCards.map((item) => this.businessCards.directoryRank(item.id)),
      ),
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

    return {
      biolinks: biolinks.map((item, index) => ({
        ...item,
        views: item._count.scanEvents,
        likes: item._count.likes,
        rank: biolinkRanks[index],
        lastBoostedAt: approvedByTarget.get(`BIOLINK:${item.id}`) ?? null,
      })),
      businessCards: businessCards.map((item, index) => ({
        ...item,
        views: item._count.scans,
        likes: item._count.likes,
        rank: cardRanks[index],
        lastBoostedAt: approvedByTarget.get(`BUSINESS_CARD:${item.id}`) ?? null,
      })),
      requests,
    };
  }

  async create(userId: string, dto: CreateBoostDto) {
    const target = await this.findOwnedTarget(userId, dto.kind, dto.targetId);
    if (target.status !== 'APPROVED' || !target.isPublished) {
      throw new BadRequestException(
        'فقط کارت‌ها/بیولینک‌های تأییدشده و منتشرشده را می‌توان پله کرد',
      );
    }

    const pending = await this.prisma.boostRequest.findFirst({
      where: {
        userId,
        kind: dto.kind,
        targetId: dto.targetId,
        status: BoostStatus.PENDING,
      },
    });
    if (pending) {
      throw new ConflictException('برای این مورد قبلاً درخواست پله ثبت شده است');
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

    await this.notifications.notifyAdmins({
      category: 'BOOST',
      title: 'درخواست پله جدید',
      body: `یک درخواست «پله» برای ${dto.kind === 'BIOLINK' ? 'بیولینک' : 'کارت ویزیت'} ثبت شد.`,
      type: NotificationType.INFO,
      link: '/admin?section=boosts',
      actorId: userId,
    });

    await this.activity.log({
      action: 'BOOST_REQUESTED',
      summary: `درخواست پله برای ${dto.kind === 'BIOLINK' ? 'بیولینک' : 'کارت ویزیت'}`,
      entityType: 'BOOST',
      entityId: request.id,
    });

    return request;
  }

  async listRequests(status?: BoostStatus) {
    const where: Prisma.BoostRequestWhereInput = status ? { status } : {};
    const requests = await this.prisma.boostRequest.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        decidedBy: { select: { id: true, email: true, fullName: true } },
      },
      orderBy: { requestedAt: 'desc' },
      take: 200,
    });

    // Attach a human-readable label of the boosted item.
    const biolinkIds = requests
      .filter((r) => r.kind === BoostTargetKind.BIOLINK)
      .map((r) => r.targetId);
    const cardIds = requests
      .filter((r) => r.kind === BoostTargetKind.BUSINESS_CARD)
      .map((r) => r.targetId);

    const [biolinks, cards] = await Promise.all([
      biolinkIds.length
        ? this.prisma.biolink.findMany({
            where: { id: { in: biolinkIds } },
            select: { id: true, fullName: true, slug: true },
          })
        : Promise.resolve([]),
      cardIds.length
        ? this.prisma.businessCard.findMany({
            where: { id: { in: cardIds } },
            select: { id: true, fullName: true, slug: true },
          })
        : Promise.resolve([]),
    ]);
    const map = new Map<string, { id: string; fullName: string; slug: string }>();
    [...biolinks, ...cards].forEach((item) => map.set(item.id, item));

    return requests.map((request) => ({
      ...request,
      target: map.get(request.targetId) ?? null,
    }));
  }

  /**
   * Admin decision. Approving pins the item to the top of its directory by
   * setting `boostedUntil`; the value is always "now + BOOST_DURATION_MS".
   */
  async decide(adminId: string, requestId: string, dto: DecideBoostDto) {
    const request = await this.prisma.boostRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException('درخواست پله یافت نشد');
    }
    if (request.status !== BoostStatus.PENDING) {
      throw new BadRequestException('این درخواست قبلاً بررسی شده است');
    }

    const now = new Date();
    const approved = dto.status === BoostStatus.APPROVED;

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
        const boostedUntil = new Date(now.getTime() + BOOST_DURATION_MS);
        if (request.kind === BoostTargetKind.BIOLINK) {
          await tx.biolink.update({
            where: { id: request.targetId },
            // resetting `pinnedAt` pushes the item back to the top of the
            // directory by "newness" — exactly like a freshly created item.
            data: { boostedUntil, pinnedAt: now },
          });
        } else {
          await tx.businessCard.update({
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

    return updated;
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
