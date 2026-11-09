import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  FeedTagKind,
  NewsStatus,
  NotificationType,
  SubscriptionStatus,
} from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { FINANCE_SOURCE_TYPES } from '../finance/finance.constants';
import { FinanceService } from '../finance/finance.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { FacetsCacheService } from '../common/facets-cache.service';
import { feedPostInclude, feedTagInclude } from './feeds.shared';

/**
 * Admin side of «فیدها»: post moderation, the paid-tag decisions, and the
 * package/topic catalogue (including the boot-time default packages). Split out
 * of `FeedsService` so the user panel and the moderation console stay separate.
 */
@Injectable()
export class FeedsAdminService {
  private readonly logger = new Logger(FeedsAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityService,
    private readonly facetsCache: FacetsCacheService,
    private readonly finance: FinanceService,
  ) {}

  async ensureDefaultPackages(): Promise<void> {
    const existing = await this.prisma.feedPackage.count();
    if (existing > 0) return;
    await this.prisma.feedPackage.createMany({
      data: [
        {
          name: 'اشتراک یک‌ماهه ۵ پست',
          description: 'امکان انتشار ۵ پست در فید به مدت یک ماه.',
          price: 0,
          postsQuota: 5,
          durationDays: 30,
          sortOrder: 1,
        },
        {
          name: 'اشتراک یک‌ماهه ۱۰ پست',
          description: 'امکان انتشار ۱۰ پست در فید به مدت یک ماه.',
          price: 0,
          postsQuota: 10,
          durationDays: 30,
          sortOrder: 2,
        },
      ],
    });
  }

  // ------------------------------------------------------------------
  //  public feed directory
  // ------------------------------------------------------------------


  /** One published feed post by id + visitor like/save state. */

  async listPackages(activeOnly = true) {
    return this.prisma.feedPackage.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
    });
  }

  // ------------------------------------------------------------------
  //  user panel
  // ------------------------------------------------------------------

  /** The user's feed subscription state, packages and their own posts. */

  async adminListPosts(status?: NewsStatus) {
    const posts = await this.prisma.feedPost.findMany({
      where: status ? { status } : {},
      include: { ...feedPostInclude, ...feedTagInclude },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return posts.map(({ _count, tagBiolink, tagBusinessCard, ...post }) => {
      // Admins see the tag even before payment, so they can confirm/reject it.
      const target = post.tagKind === FeedTagKind.BIOLINK ? tagBiolink : tagBusinessCard;
      return {
        ...post,
        likeCount: _count.likes,
        tag:
          post.tagKind && target
            ? {
                kind: post.tagKind,
                slug: target.slug,
                fullName: target.fullName,
                company: target.company,
                href:
                  post.tagKind === FeedTagKind.BIOLINK
                    ? `/biolinks/${target.slug}`
                    : `/business-cards/${target.slug}`,
              }
            : null,
      };
    });
  }

  async moderatePost(adminId: string, id: string, decision: NewsStatus, reason?: string) {
    const post = await this.prisma.feedPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('پست فید یافت نشد');
    const approved = decision === NewsStatus.APPROVED;
    const updated = await this.prisma.feedPost.update({
      where: { id },
      data: {
        status: decision,
        reason: approved ? null : reason ?? null,
        isPublished: approved,
        publishedAt: approved ? post.publishedAt ?? new Date() : null,
      },
    });
    await this.notifications.notify({
      userId: post.userId,
      title: approved ? 'پست فید شما تأیید شد' : 'پست فید شما رد شد',
      body: approved
        ? post.tagKind && !post.tagPaid
          ? 'پست شما در فید منتشر شد. توجه: تا تأیید پرداخت تگ، لینک کارت/بیولینک شما نمایش داده نمی‌شود.'
          : 'پست شما در فید منتشر شد.'
        : reason
          ? `پست شما رد شد: ${reason}`
          : 'پست شما رد شد.',
      type: approved ? NotificationType.SUCCESS : NotificationType.WARNING,
      link: '/dashboard/feeds',
      actorId: adminId,
    });
    await this.activity.log({
      actor: { id: adminId },
      action: approved ? 'FEED_APPROVED' : 'FEED_REJECTED',
      summary: `${approved ? 'تأیید' : 'رد'} پست فید`,
      entityType: 'FEED',
      entityId: id,
    });
    this.facetsCache.invalidate('dir:feeds');
    return updated;
  }

  async adminRemovePost(id: string) {
    const post = await this.prisma.feedPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('پست فید یافت نشد');
    await this.prisma.feedPost.delete({ where: { id } });
    this.facetsCache.invalidate('dir:feeds');
    return { deleted: true };
  }

  /**
   * Confirm or reject the (currently simulated) payment for a post's tag.
   * Confirming makes the card/biolink link public on the feed; rejecting clears
   * the tag so no fee is owed. There is no real gateway yet, so the admin acts
   * as the payment confirmation here.
   */

  async decideTagPayment(
    adminId: string,
    postId: string,
    decision: 'CONFIRM' | 'REJECT',
  ) {
    const post = await this.prisma.feedPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('پست فید یافت نشد');
    if (!post.tagKind) {
      throw new BadRequestException('این پست تگی ندارد');
    }
    const confirm = decision === 'CONFIRM';
    const updated = await this.prisma.feedPost.update({
      where: { id: postId },
      data: confirm
        ? { tagPaid: true, tagDecidedAt: new Date(), tagDecidedById: adminId }
        : {
            tagKind: null,
            tagBiolinkId: null,
            tagBusinessCardId: null,
            tagPaid: false,
            tagPrice: null,
            tagDecidedAt: new Date(),
            tagDecidedById: adminId,
          },
    });
    await this.notifications.notify({
      userId: post.userId,
      title: confirm ? 'پرداخت تگ پست شما تأیید شد' : 'پرداخت تگ پست شما رد شد',
      body: confirm
        ? 'لینک کارت/بیولینک شما در فید نمایش داده می‌شود.'
        : 'تگ پست شما حذف شد و مبلغی محاسبه نمی‌شود.',
      type: confirm ? NotificationType.SUCCESS : NotificationType.WARNING,
      link: '/dashboard/feeds',
      actorId: adminId,
    });
    await this.activity.log({
      actor: { id: adminId },
      action: confirm ? 'FEED_TAG_PAID' : 'FEED_TAG_REJECTED',
      summary: `${confirm ? 'تأیید' : 'رد'} پرداخت تگ پست فید`,
      entityType: 'FEED',
      entityId: postId,
    });
    try {
      if (confirm) {
        const confirmedAt = updated.tagDecidedAt ?? new Date();
        await this.finance.recordSale({
          sourceType: FINANCE_SOURCE_TYPES.FEED_TAG,
          // Each confirmation is its own sale; a later re-confirmation after a
          // rejection must get a fresh invoice, not reuse the voided one.
          sourceId: `${post.id}:${confirmedAt.getTime()}`,
          title: 'تگ کارت/بیولینک روی پست فید',
          amount: post.tagPrice ?? 0,
          paidAt: confirmedAt,
          userId: post.userId,
          metadata: { postId: post.id, tagKind: post.tagKind },
        });
      } else {
        const previousDecision = post.tagDecidedAt ?? post.createdAt;
        await this.finance.voidBySource(
          FINANCE_SOURCE_TYPES.FEED_TAG,
          `${post.id}:${previousDecision.getTime()}`,
          'رد پرداخت تگ توسط مدیر',
        );
      }
    } catch (error) {
      // The tag decision itself must not fail because of the tax archive.
      this.logger.warn(
        `invoice sync failed for feed tag ${post.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    this.facetsCache.invalidate('dir:feeds');
    return updated;
  }

  // ---- admin: packages ----

  createPackage(data: {
    name: string;
    description?: string;
    price?: number;
    postsQuota: number;
    durationDays?: number;
    isActive?: boolean;
    sortOrder?: number;
  }) {
    return this.prisma.feedPackage.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        price: data.price ?? 0,
        postsQuota: data.postsQuota,
        durationDays: data.durationDays ?? 30,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async updatePackage(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      price: number;
      postsQuota: number;
      durationDays: number;
      isActive: boolean;
      sortOrder: number;
    }>,
  ) {
    const pkg = await this.prisma.feedPackage.findUnique({ where: { id } });
    if (!pkg) throw new NotFoundException('بسته فید یافت نشد');
    return this.prisma.feedPackage.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.price !== undefined ? { price: data.price } : {}),
        ...(data.postsQuota !== undefined ? { postsQuota: data.postsQuota } : {}),
        ...(data.durationDays !== undefined ? { durationDays: data.durationDays } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      },
    });
  }

  async removePackage(id: string) {
    const pkg = await this.prisma.feedPackage.findUnique({ where: { id } });
    if (!pkg) throw new NotFoundException('بسته فید یافت نشد');
    await this.prisma.feedPackage.delete({ where: { id } });
    return { deleted: true };
  }

  // ---- admin: subscriptions ----

  listSubscriptions(status?: SubscriptionStatus) {
    return this.prisma.userFeedSubscription.findMany({
      where: status ? { status } : {},
      orderBy: { requestedAt: 'desc' },
      take: 200,
      include: {
        package: true,
        user: { select: { id: true, email: true, fullName: true } },
        decidedBy: { select: { id: true, email: true, fullName: true } },
      },
    });
  }

  async decideSubscription(
    adminId: string,
    id: string,
    decision: SubscriptionStatus,
    adminNote?: string,
  ) {
    const sub = await this.prisma.userFeedSubscription.findUnique({
      where: { id },
      include: { package: true },
    });
    if (!sub) throw new NotFoundException('اشتراک فید یافت نشد');
    if (sub.status !== SubscriptionStatus.PENDING) {
      throw new BadRequestException('این درخواست قبلاً بررسی شده است');
    }
    const now = new Date();
    const approved = decision === SubscriptionStatus.ACTIVE;

    // An *upgrade* is an approval given while another ACTIVE subscription is
    // still inside its paid window. In that case the new package's quota must
    // account for the posts the user already has, and its days start from now.
    const existingActive = approved
      ? await this.prisma.userFeedSubscription.findFirst({
          where: {
            userId: sub.userId,
            status: SubscriptionStatus.ACTIVE,
            id: { not: id },
            expiresAt: { gt: now },
          },
        })
      : null;
    const existingPostCount = existingActive
      ? await this.prisma.feedPost.count({ where: { userId: sub.userId } })
      : 0;

    const updated = await this.prisma.userFeedSubscription.update({
      where: { id },
      data: {
        status: decision,
        decidedAt: now,
        decidedById: adminId,
        adminNote: adminNote ?? null,
        startedAt: approved ? now : null,
        expiresAt: approved
          ? new Date(now.getTime() + sub.package.durationDays * 86_400_000)
          : null,
        // On an upgrade keep counting the posts the user already published so
        // the bigger package's quota is not consumed twice.
        ...(existingActive ? { postsUsed: existingPostCount } : {}),
      },
    });

    // Retire the previous active subscription so the upgraded one becomes the
    // single source of truth for quota and expiry.
    if (existingActive) {
      await this.prisma.userFeedSubscription.update({
        where: { id: existingActive.id },
        data: { status: SubscriptionStatus.CANCELLED },
      });
    }

    await this.notifications.notify({
      userId: sub.userId,
      title: approved
        ? existingActive
          ? 'اشتراک فید شما ارتقا یافت'
          : 'اشتراک فید شما فعال شد'
        : 'درخواست اشتراک فید رد شد',
      body: approved
        ? existingActive
          ? `بسته «${sub.package.name}» فعال شد؛ ${existingPostCount.toLocaleString('fa-IR')} پست فعلی شما از سهمیه‌ی ${sub.package.postsQuota.toLocaleString('fa-IR')} تایی کسر شد.`
          : `بسته «${sub.package.name}» فعال شد و می‌توانید پست ثبت کنید.`
        : `درخواست بسته «${sub.package.name}» رد شد.` +
          (adminNote ? ` دلیل: ${adminNote}` : ''),
      type: approved ? NotificationType.SUCCESS : NotificationType.WARNING,
      link: '/dashboard/feeds',
      actorId: adminId,
    });
    await this.activity.log({
      actor: { id: adminId },
      action: approved ? 'FEED_SUBSCRIPTION_APPROVED' : 'FEED_SUBSCRIPTION_REJECTED',
      summary: `${approved ? 'تأیید' : 'رد'} اشتراک فید «${sub.package.name}»`,
      entityType: 'FEED',
      entityId: id,
    });
    return updated;
  }

  // ---- admin: topics ----

  createTopic(name: string) {
    return this.prisma.feedTopic.create({ data: { name } });
  }

  updateTopic(id: string, data: { name?: string; isActive?: boolean }) {
    return this.prisma.feedTopic.update({ where: { id }, data });
  }

  async removeTopic(id: string) {
    await this.prisma.feedTopic.delete({ where: { id } });
    return { deleted: true };
  }
}
