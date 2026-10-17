import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  AdTargetKind,
  BoostStatus,
  BoostTargetKind,
  NotificationType,
  RewardKind,
} from '@prisma/client';

import { ActivityService } from '../activity/activity.service';
import { FacetsCacheService } from '../common/facets-cache.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import {
  AdjustPointsDto,
  CreateRewardDto,
  RedeemRewardDto,
  UpdateRewardDto,
} from './dto/reward.dto';

/**
 * Points («امتیاز») ledger + rewards. Users earn points for each approved
 * «نبض شهر» news item (value set by the admin) and redeem them for rewards the
 * admin defines — a paid subscription, a home-page ad, or a directory boost.
 *
 * Every balance change writes a `PointsLedger` row and updates
 * `User.pointsBalance` in the same transaction, so the running total can never
 * drift from the audit trail.
 */
@Injectable()
export class PointsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityService,
    private readonly facetsCache: FacetsCacheService,
  ) {}

  private static readonly AD_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

  async onModuleInit(): Promise<void> {
    // Seed a starter reward catalogue (points costs the admin can edit). The
    // subscription rewards link to the built-in plans by name.
    try {
      await this.ensureDefaultRewards();
    } catch {
      // The tables may not exist on a very first boot; a later boot seeds them.
    }
  }

  /**
   * Starter rewards mirroring the spec: Eco for 50 points, Plus for 150, a
   * home-page ad for 300 and a directory boost for 250. Only created when the
   * catalogue is empty, so an admin's edits are never overwritten.
   */
  async ensureDefaultRewards(): Promise<void> {
    const existing = await this.prisma.reward.count();
    if (existing > 0) return;

    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { name: { in: ['اکو', 'بلاس'] } },
      select: { id: true, name: true },
    });
    const planId = (name: string) =>
      plans.find((plan) => plan.name === name)?.id ?? null;

    const defaults: Array<{
      title: string;
      description: string;
      kind: RewardKind;
      points: number;
      planId: string | null;
      sortOrder: number;
    }> = [
      {
        title: 'اشتراک اکو',
        description: 'فعال‌سازی اشتراک «اکو» با امتیاز.',
        kind: RewardKind.SUBSCRIPTION,
        points: 50,
        planId: planId('اکو'),
        sortOrder: 1,
      },
      {
        title: 'اشتراک بلاس',
        description: 'فعال‌سازی اشتراک «بلاس» با امتیاز.',
        kind: RewardKind.SUBSCRIPTION,
        points: 150,
        planId: planId('بلاس'),
        sortOrder: 2,
      },
      {
        title: 'تبلیغ در دایرکتوری',
        description: 'تبلیغ یک کارت/بیولینک در صدر لیست دایرکتوری همان دسته.',
        kind: RewardKind.AD_DIRECTORY,
        points: 250,
        planId: null,
        sortOrder: 3,
      },
      {
        title: 'تبلیغ در صفحه اصلی',
        description: 'نمایش یک کارت/بیولینک در کادر تبلیغات صفحه اصلی.',
        kind: RewardKind.AD_HOME,
        points: 300,
        planId: null,
        sortOrder: 4,
      },
    ];
    for (const reward of defaults) {
      await this.prisma.reward.create({ data: { ...reward, isActive: true } });
    }
  }

  /**
   * Credit points for one approved news item. Idempotent per news item: the
   * ledger is checked for a prior `NEWS_APPROVED:<id>` entry first, so a re-edit
   * or double approval never double-credits.
   */
  async earnForNews(userId: string, newsId: string): Promise<number> {
    const points = await this.settings.getPointsPerNews();
    if (points <= 0) return 0;

    const existing = await this.prisma.pointsLedger.findFirst({
      where: { userId, entityType: 'NEWS', entityId: newsId, delta: { gt: 0 } },
      select: { id: true },
    });
    if (existing) return 0;

    await this.prisma.$transaction([
      this.prisma.pointsLedger.create({
        data: {
          userId,
          delta: points,
          reason: 'تأیید خبر در نبض شهر',
          entityType: 'NEWS',
          entityId: newsId,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { pointsBalance: { increment: points } },
      }),
    ]);

    await this.notifications.notify({
      userId,
      type: NotificationType.SUCCESS,
      title: `${points.toLocaleString('fa-IR')} امتیاز دریافت کردید`,
      body: 'خبر شما در «نبض شهر» منتشر شد و امتیاز آن به حساب شما اضافه شد.',
      link: '/dashboard/points',
    });
    return points;
  }

  /** Balance, recent ledger entries and the active reward catalogue. */
  async summary(userId: string) {
    const [user, ledger, rewards, redemptions] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { pointsBalance: true },
      }),
      this.prisma.pointsLedger.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.listRewards(true),
      this.prisma.rewardRedemption.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: { reward: { select: { id: true, title: true } } },
      }),
    ]);

    return {
      balance: user?.pointsBalance ?? 0,
      ledger,
      rewards,
      redemptions,
      pointsPerNews: await this.settings.getPointsPerNews(),
    };
  }

  listRewards(activeOnly = false) {
    return this.prisma.reward.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ sortOrder: 'asc' }, { points: 'asc' }],
      include: { plan: { select: { id: true, name: true } } },
    });
  }

  /** Redeem a reward: deduct points and apply the reward's effect. */
  async redeem(userId: string, rewardId: string, dto: RedeemRewardDto) {
    const reward = await this.prisma.reward.findUnique({
      where: { id: rewardId },
      include: { plan: true },
    });
    if (!reward || !reward.isActive) {
      throw new NotFoundException('جایزه یافت نشد یا غیرفعال است');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pointsBalance: true },
    });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    if (user.pointsBalance < reward.points) {
      throw new BadRequestException('امتیاز کافی برای دریافت این جایزه ندارید');
    }

    // Validate any target an ad/boost reward needs *before* spending points.
    let target: { id: string; kind: AdTargetKind } | null = null;
    if (reward.kind === RewardKind.AD_HOME || reward.kind === RewardKind.AD_DIRECTORY) {
      target = await this.resolveOwnedTarget(userId, dto);
    }
    if (reward.kind === RewardKind.SUBSCRIPTION && !reward.planId) {
      throw new BadRequestException('این جایزه به پلن معتبری متصل نیست');
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.pointsLedger.create({
        data: {
          userId,
          delta: -reward.points,
          reason: `دریافت جایزه «${reward.title}»`,
          entityType: 'REWARD',
          entityId: reward.id,
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: { pointsBalance: { decrement: reward.points } },
      });
      await tx.rewardRedemption.create({
        data: {
          userId,
          rewardId: reward.id,
          pointsSpent: reward.points,
          detail: target ? `${target.kind}:${target.id}` : reward.plan?.name ?? null,
        },
      });

      if (reward.kind === RewardKind.SUBSCRIPTION && reward.planId) {
        await tx.user.update({
          where: { id: userId },
          data: { planId: reward.planId },
        });
      } else if (reward.kind === RewardKind.AD_HOME && target) {
        await tx.adRequest.create({
          data: {
            userId,
            kind: target.kind,
            targetId: target.id,
            status: BoostStatus.APPROVED,
            decidedAt: now,
            startedAt: now,
            endsAt: new Date(now.getTime() + PointsService.AD_DURATION_MS),
            adminNote: 'جایزه امتیاز',
          },
        });
      } else if (reward.kind === RewardKind.AD_DIRECTORY && target) {
        await tx.boostRequest.create({
          data: {
            userId,
            kind:
              target.kind === AdTargetKind.BIOLINK
                ? BoostTargetKind.BIOLINK
                : BoostTargetKind.BUSINESS_CARD,
            targetId: target.id,
            status: BoostStatus.APPROVED,
            decidedAt: now,
            adminNote: 'جایزه امتیاز',
          },
        });
        const boostedUntil = new Date(
          now.getTime() + (await this.settings.getBoostDurationDays()) * 86_400_000,
        );
        if (target.kind === AdTargetKind.BIOLINK) {
          await tx.biolink.update({
            where: { id: target.id },
            data: { boostedUntil },
          });
        } else {
          await tx.businessCard.update({
            where: { id: target.id },
            data: { boostedUntil },
          });
        }
      }
    });

    await this.activity.log({
      action: 'REWARD_REDEEMED',
      summary: `دریافت جایزه «${reward.title}» با ${reward.points} امتیاز`,
      entityType: 'REWARD',
      entityId: reward.id,
    });

    if (reward.kind !== RewardKind.SUBSCRIPTION) {
      this.facetsCache.invalidate('ads:');
      this.facetsCache.invalidateDirectory(
        target?.kind === AdTargetKind.BIOLINK ? 'biolink' : 'businesscard',
      );
    }

    const updated = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pointsBalance: true },
    });
    return { redeemed: true, balance: updated?.pointsBalance ?? 0 };
  }

  // ---- admin ----

  async createReward(dto: CreateRewardDto) {
    if (dto.kind === RewardKind.SUBSCRIPTION && !dto.planId) {
      throw new BadRequestException('برای جایزه اشتراک، انتخاب پلن الزامی است');
    }
    return this.prisma.reward.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        kind: dto.kind,
        points: dto.points,
        planId: dto.planId ?? null,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateReward(id: string, dto: UpdateRewardDto) {
    const reward = await this.prisma.reward.findUnique({ where: { id } });
    if (!reward) throw new NotFoundException('جایزه یافت نشد');
    return this.prisma.reward.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
        ...(dto.points !== undefined ? { points: dto.points } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  async removeReward(id: string) {
    const reward = await this.prisma.reward.findUnique({ where: { id } });
    if (!reward) throw new NotFoundException('جایزه یافت نشد');
    await this.prisma.reward.delete({ where: { id } });
    return { deleted: true };
  }

  /** Admin view of all balances + recent redemptions. */
  async adminOverview() {
    const [topUsers, redemptions, rewardCount] = await Promise.all([
      this.prisma.user.findMany({
        where: { pointsBalance: { gt: 0 } },
        orderBy: { pointsBalance: 'desc' },
        take: 50,
        select: {
          id: true,
          email: true,
          fullName: true,
          pointsBalance: true,
        },
      }),
      this.prisma.rewardRedemption.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          reward: { select: { id: true, title: true } },
          user: { select: { id: true, email: true, fullName: true } },
        },
      }),
      this.prisma.reward.count(),
    ]);
    return { topUsers, redemptions, rewardCount };
  }

  /** Admin manual adjustment of a user's balance (adds a ledger row). */
  async adjustPoints(userId: string, dto: AdjustPointsDto) {
    if (!Number.isInteger(dto.delta) || dto.delta === 0) {
      throw new BadRequestException('مقدار امتیاز باید عددی غیرصفر باشد');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('کاربر یافت نشد');

    const nextBalance = user.pointsBalance + dto.delta;
    if (nextBalance < 0) {
      throw new BadRequestException('کسر امتیاز بیشتر از موجودی کاربر است');
    }

    await this.prisma.$transaction([
      this.prisma.pointsLedger.create({
        data: {
          userId,
          delta: dto.delta,
          reason: dto.reason ?? 'تنظیم دستی مدیر',
          entityType: 'ADMIN',
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { pointsBalance: { increment: dto.delta } },
      }),
    ]);

    await this.activity.log({
      action: 'POINTS_ADJUSTED',
      summary: `تنظیم ${dto.delta > 0 ? '+' : ''}${dto.delta} امتیاز برای کاربر`,
      entityType: 'USER',
      entityId: userId,
    });

    return { pointsBalance: nextBalance };
  }

  /** Validate that the reward's ad/boost target belongs to the user & is live. */
  private async resolveOwnedTarget(userId: string, dto: RedeemRewardDto) {
    if (!dto.targetId || !dto.targetKind) {
      throw new BadRequestException(
        'برای این جایزه انتخاب کارت ویزیت یا بیولینک الزامی است',
      );
    }
    if (dto.targetKind === 'BIOLINK') {
      const biolink = await this.prisma.biolink.findUnique({
        where: { id: dto.targetId },
        select: { id: true, userId: true, isPublished: true },
      });
      if (!biolink) throw new NotFoundException('بیولینک یافت نشد');
      if (biolink.userId !== userId) {
        throw new ForbiddenException('دسترسی به این بیولینک مجاز نیست');
      }
      if (!biolink.isPublished) {
        throw new BadRequestException('بیولینک باید تأیید و منتشر شده باشد');
      }
      return { id: biolink.id, kind: AdTargetKind.BIOLINK };
    }
    const card = await this.prisma.businessCard.findUnique({
      where: { id: dto.targetId },
      select: { id: true, userId: true, isPublished: true },
    });
    if (!card) throw new NotFoundException('کارت ویزیت یافت نشد');
    if (card.userId !== userId) {
      throw new ForbiddenException('دسترسی به این کارت ویزیت مجاز نیست');
    }
    if (!card.isPublished) {
      throw new BadRequestException('کارت ویزیت باید تأیید و منتشر شده باشد');
    }
    return { id: card.id, kind: AdTargetKind.BUSINESS_CARD };
  }
}
