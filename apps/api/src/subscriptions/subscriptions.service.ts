import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { NotificationType, Prisma, SubscriptionStatus } from '@prisma/client';

import {
  DEFAULT_PLAN,
  DEFAULT_PLANS,
  planLimitsFrom,
  PlanLimits,
} from '../common/plans';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { DecideSubscriptionDto } from './dto/decide-subscription.dto';
import { RequestSubscriptionDto } from './dto/request-subscription.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class SubscriptionsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Make sure the built-in plans always exist, even without running the seed.
    try {
      await this.ensureDefaultPlans();
    } catch {
      // The table may not exist yet on a very first boot; ignore and let the
      // entrypoint `prisma db push` create it, a later boot will seed it.
    }
  }

  /**
   * Ensure the three built-in plans exist. Called on boot (seeding) and before
   * any plan listing so the catalogue is never empty.
   */
  async ensureDefaultPlans() {
    for (const plan of DEFAULT_PLANS) {
      await this.prisma.subscriptionPlan.upsert({
        where: { name: plan.name },
        update: {},
        create: {
          name: plan.name,
          description: plan.description,
          price: plan.price,
          maxBiolinks: plan.maxBiolinks,
          maxBusinessCards: plan.maxBusinessCards,
          showSocialLinks: plan.showSocialLinks,
          features: plan.features,
          sortOrder: plan.sortOrder,
          isActive: true,
        },
      });
    }
  }

  listPlans(activeOnly = true) {
    return this.prisma.subscriptionPlan.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
    });
  }

  /**
   * Brand-new users start on the free plan. We assign it lazily the first time
   * their limits/subscription are read, so the panel shows «اشتراک فعلی شما»
   * on the free plan instead of an «درخواست اشتراک» button.
   */
  private async ensureDefaultPlanForUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { planId: true },
    });
    if (!user || user.planId) return;
    const free = await this.prisma.subscriptionPlan.findFirst({
      where: { name: DEFAULT_PLAN.name },
      select: { id: true },
    });
    if (!free) return;
    await this.prisma.user.update({
      where: { id: userId },
      data: { planId: free.id },
    });
  }

  /**
   * Give a brand-new user the free plan immediately (called on registration).
   * Kept public so auth can seed the account without duplicating the lookup.
   */
  async assignDefaultPlan(userId: string): Promise<void> {
    await this.ensureDefaultPlanForUser(userId);
  }

  async createPlan(dto: CreatePlanDto) {
    const exists = await this.prisma.subscriptionPlan.findUnique({
      where: { name: dto.name },
    });
    if (exists) {
      throw new ConflictException('اشتراکی با این نام قبلاً وجود دارد');
    }
    return this.prisma.subscriptionPlan.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price ?? 0,
        maxBiolinks: dto.maxBiolinks ?? 1,
        maxBusinessCards: dto.maxBusinessCards ?? 1,
        showSocialLinks: dto.showSocialLinks ?? true,
        features: dto.features ?? [],
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 99,
      },
    });
  }

  async updatePlan(id: string, dto: UpdatePlanDto) {
    await this.getPlan(id);
    return this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...dto,
      },
    });
  }

  async getPlan(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException('اشتراک یافت نشد');
    }
    return plan;
  }

  async removePlan(id: string) {
    const activeUsers = await this.prisma.user.count({ where: { planId: id } });
    if (activeUsers > 0) {
      throw new BadRequestException(
        'این اشتراک به کاربران فعال اختصاص یافته و قابل حذف نیست؛ آن را غیرفعال کنید.',
      );
    }
    await this.getPlan(id);
    await this.prisma.subscriptionPlan.delete({ where: { id } });
    return { deleted: true };
  }

  /** The plan limits currently in force for a user. */
  async limitsForUser(userId: string): Promise<PlanLimits> {
    await this.ensureDefaultPlanForUser(userId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { plan: true },
    });
    return planLimitsFrom(user?.plan ?? null);
  }

  async mySubscriptions(userId: string) {
    await this.ensureDefaultPlanForUser(userId);
    const [plan, requests] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        include: { plan: true },
      }),
      this.prisma.userSubscription.findMany({
        where: { userId },
        include: { plan: true },
        orderBy: { requestedAt: 'desc' },
        take: 20,
      }),
    ]);
    return { plan: plan?.plan ?? null, requests };
  }

  /**
   * A user requests a plan. A pending request replaces any previous pending one.
   * If the user is already on that plan, the request is rejected early.
   */
  async requestSubscription(userId: string, dto: RequestSubscriptionDto) {
    const plan = await this.getPlan(dto.planId);
    if (!plan.isActive) {
      throw new BadRequestException('این اشتراک در حال حاضر فعال نیست');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.planId === plan.id) {
      throw new BadRequestException('شما در حال حاضر مشترک این بسته هستید');
    }

    await this.prisma.userSubscription.deleteMany({
      where: { userId, status: SubscriptionStatus.PENDING },
    });

    const request = await this.prisma.userSubscription.create({
      data: { userId, planId: plan.id, note: dto.note },
      include: { plan: true },
    });

    await this.notifications.notifyAdmins({
      category: 'SUBSCRIPTION',
      title: 'درخواست اشتراک جدید',
      body: `${user?.fullName ?? user?.email ?? 'کاربر'} درخواست بسته «${plan.name}» را ثبت کرد.`,
      type: NotificationType.INFO,
      link: '/admin?section=subscriptions',
      actorId: userId,
    });

    return request;
  }

  async listRequests(status?: SubscriptionStatus) {
    const where: Prisma.UserSubscriptionWhereInput = status ? { status } : {};
    return this.prisma.userSubscription.findMany({
      where,
      include: {
        plan: true,
        user: { select: { id: true, email: true, fullName: true } },
        decidedBy: { select: { id: true, email: true, fullName: true } },
      },
      orderBy: { requestedAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Admin decides a subscription request. Approving applies the plan to the user
   * (and cancels that user's other pending/active requests).
   */
  async decideRequest(
    adminId: string,
    requestId: string,
    dto: DecideSubscriptionDto,
  ) {
    const request = await this.prisma.userSubscription.findUnique({
      where: { id: requestId },
      include: { plan: true },
    });
    if (!request) {
      throw new NotFoundException('درخواست اشتراک یافت نشد');
    }
    if (request.status !== SubscriptionStatus.PENDING) {
      throw new BadRequestException('این درخواست قبلاً بررسی شده است');
    }

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.userSubscription.update({
        where: { id: requestId },
        data: {
          status: dto.status,
          decidedAt: now,
          decidedById: adminId,
          adminNote: dto.adminNote ?? null,
        },
        include: { plan: true },
      });

      if (dto.status === SubscriptionStatus.ACTIVE) {
        await tx.user.update({
          where: { id: request.userId },
          data: { planId: request.planId },
        });
        // supersede any other pending requests for this user
        await tx.userSubscription.updateMany({
          where: {
            userId: request.userId,
            status: SubscriptionStatus.PENDING,
            id: { not: requestId },
          },
          data: {
            status: SubscriptionStatus.CANCELLED,
            decidedAt: now,
            decidedById: adminId,
            adminNote: 'با تأیید درخواست دیگر لغو شد',
          },
        });
      }

      return updated;
    });

    const approved = dto.status === SubscriptionStatus.ACTIVE;
    await this.notifications.notify({
      userId: request.userId,
      type: approved ? NotificationType.SUCCESS : NotificationType.WARNING,
      title: approved ? 'اشتراک شما فعال شد' : 'درخواست اشتراک شما رد شد',
      body: approved
        ? `بسته «${request.plan?.name ?? ''}» روی حساب شما فعال شد.`
        : `درخواست بسته «${request.plan?.name ?? ''}» رد شد.` +
          (dto.adminNote ? ` دلیل: ${dto.adminNote}` : ''),
      link: '/dashboard/subscriptions',
      actorId: adminId,
    });

    return updated;
  }

  /** Admin assigns a plan directly to a user (no request needed). */
  async assignPlan(userId: string, planId: string | null) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }
    const plan = planId ? await this.getPlan(planId) : null;
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { planId },
      select: { id: true, email: true, fullName: true, planId: true },
    });

    if (plan) {
      await this.notifications.notify({
        userId,
        type: NotificationType.SUCCESS,
        title: 'اشتراک شما تغییر کرد',
        body: `بسته «${plan.name}» روی حساب شما فعال شد.`,
        link: '/dashboard/subscriptions',
      });
    }

    return updated;
  }

  async enforceNotExceeded(userId: string, kind: 'biolink' | 'businessCard') {
    await this.ensureDefaultPlanForUser(userId);
    const limits = await this.limitsForUser(userId);
    if (kind === 'biolink') {
      const count = await this.prisma.biolink.count({ where: { userId } });
      if (count >= limits.maxBiolinks) {
        throw new ForbiddenException(
          `سقف اشتراک شما (${limits.maxBiolinks} بیولینک) تکمیل شده است. برای ساخت بیشتر اشتراک خود را ارتقا دهید.`,
        );
      }
    } else {
      const count = await this.prisma.businessCard.count({ where: { userId } });
      if (count >= limits.maxBusinessCards) {
        throw new ForbiddenException(
          `سقف اشتراک شما (${limits.maxBusinessCards} کارت ویزیت) تکمیل شده است. برای ساخت بیشتر اشتراک خود را ارتقا دهید.`,
        );
      }
    }
  }
}
