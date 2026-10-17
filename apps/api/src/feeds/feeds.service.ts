import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  NewsStatus,
  NotificationType,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';

import { ActivityService } from '../activity/activity.service';
import { FacetsCacheService } from '../common/facets-cache.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CreateFeedPostDto, ListFeedQueryDto } from './dto/feed.dto';

const DIRECTORY_CACHE_TTL_MS = (() => {
  const parsed = Number(process.env.DIRECTORY_CACHE_TTL_MS ?? 15_000);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 15_000;
})();

const feedPostInclude = {
  user: { select: { id: true, fullName: true, email: true } },
  topic: { select: { id: true, name: true } },
  _count: { select: { likes: true } },
} satisfies Prisma.FeedPostInclude;

/**
 * «فیدها» — an Instagram-style feed. Users buy a monthly package (a post
 * quota), submit posts (text + images) and an admin approves each before it
 * appears in the public feed directory. The directory supports topic filter +
 * text search and reuses the same infinite-scroll envelope as the other
 * directories.
 */
@Injectable()
export class FeedsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityService,
    private readonly facetsCache: FacetsCacheService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureDefaultPackages();
    } catch {
      // tables may not exist on a very first boot; a later boot seeds them
    }
  }

  /** Starter packages from the spec: 5 posts / 10 posts, both monthly. */
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

  async publicDirectory(query: ListFeedQueryDto, visitorKey?: string, userId?: string) {
    const limit = await this.settings.getDirectoryPageSize();
    const { page, q, topicId } = query;

    const cacheKey = [
      'dir:feeds',
      topicId ?? '-',
      q ? q.trim().toLowerCase() : '-',
      page,
      limit,
    ].join(':');

    const { items, total } = await this.facetsCache.get(
      cacheKey,
      () => this.loadDirectoryPage(query, limit),
      DIRECTORY_CACHE_TTL_MS,
    );

    const topics = await this.listTopics(true);
    const postIds = items.map((item) => item.id);
    const [likedIds, savedIds] = await Promise.all([
      visitorKey
        ? this.prisma.feedLike
            .findMany({
              where: { visitorKey, feedPostId: { in: postIds } },
              select: { feedPostId: true },
            })
            .then((rows) => new Set(rows.map((row) => row.feedPostId)))
        : Promise.resolve(new Set<string>()),
      userId
        ? this.prisma.feedSave
            .findMany({
              where: { userId, feedPostId: { in: postIds } },
              select: { feedPostId: true },
            })
            .then((rows) => new Set(rows.map((row) => row.feedPostId)))
        : Promise.resolve(new Set<string>()),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        liked: likedIds.has(item.id),
        saved: savedIds.has(item.id),
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      filters: { topics },
    };
  }

  private async loadDirectoryPage(query: ListFeedQueryDto, limit: number) {
    const { page, q, topicId } = query;
    const where: Prisma.FeedPostWhereInput = {
      status: NewsStatus.APPROVED,
      isPublished: true,
      ...(topicId ? { topicId } : {}),
      ...(q ? { body: { contains: q, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.feedPost.findMany({
        where,
        include: feedPostInclude,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.feedPost.count({ where }),
    ]);
    const items = rows.map(({ _count, ...post }) => ({
      ...post,
      likeCount: _count.likes,
    }));
    return { items, total };
  }

  /** One published feed post by id + visitor like/save state. */
  async publicPost(id: string, visitorKey?: string, userId?: string) {
    const post = await this.prisma.feedPost.findFirst({
      where: { id, status: NewsStatus.APPROVED, isPublished: true },
      include: feedPostInclude,
    });
    if (!post) throw new NotFoundException('پست فید یافت نشد');

    const [liked, saved] = await Promise.all([
      visitorKey
        ? this.prisma.feedLike
            .findUnique({
              where: { feedPostId_visitorKey: { feedPostId: id, visitorKey } },
            })
            .then(Boolean)
        : false,
      userId
        ? this.prisma.feedSave
            .findUnique({ where: { userId_feedPostId: { userId, feedPostId: id } } })
            .then(Boolean)
        : false,
    ]);
    const { _count, ...rest } = post;
    return { ...rest, likeCount: _count.likes, liked, saved };
  }

  async toggleLike(id: string, visitorKey: string) {
    const post = await this.prisma.feedPost.findFirst({
      where: { id, status: NewsStatus.APPROVED, isPublished: true },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('پست فید یافت نشد');
    const existing = await this.prisma.feedLike.findUnique({
      where: { feedPostId_visitorKey: { feedPostId: id, visitorKey } },
    });
    if (existing) {
      await this.prisma.feedLike.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.feedLike.create({ data: { feedPostId: id, visitorKey } });
    }
    const likeCount = await this.prisma.feedLike.count({ where: { feedPostId: id } });
    return { liked: !existing, likeCount };
  }

  async toggleSave(id: string, userId: string) {
    const post = await this.prisma.feedPost.findFirst({
      where: { id, status: NewsStatus.APPROVED, isPublished: true },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('پست فید یافت نشد');
    const existing = await this.prisma.feedSave.findUnique({
      where: { userId_feedPostId: { userId, feedPostId: id } },
    });
    if (existing) {
      await this.prisma.feedSave.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.feedSave.create({ data: { userId, feedPostId: id } });
    }
    return { saved: !existing };
  }

  async listTopics(activeOnly = true) {
    return this.prisma.feedTopic.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { name: 'asc' },
    });
  }

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
  async myOverview(userId: string) {
    const [packages, subscriptions, posts, topics, maxImages, maxImageKb] =
      await Promise.all([
        this.listPackages(true),
        this.prisma.userFeedSubscription.findMany({
          where: { userId },
          orderBy: { requestedAt: 'desc' },
          include: {
            package: {
              select: { id: true, name: true, postsQuota: true },
            },
          },
        }),
        this.prisma.feedPost.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          include: feedPostInclude,
        }),
        this.listTopics(true),
        this.settings.getFeedMaxImages(),
        this.settings.getFeedMaxImageKb(),
      ]);

    return {
      packages,
      subscriptions,
      posts: posts.map(({ _count, ...post }) => ({
        ...post,
        likeCount: _count.likes,
      })),
      topics,
      active: this.activeSubscription(subscriptions),
      limits: { maxImages, maxImageKb },
    };
  }

  /** The active (approved, unexpired, quota left) subscription, if any. */
  private activeSubscription(
    subscriptions: Array<{
      id: string;
      status: SubscriptionStatus;
      expiresAt: Date | null;
      postsUsed: number;
      package?: { id: string; name: string; postsQuota: number } | null;
    }>,
  ) {
    const now = new Date();
    return (
      subscriptions.find(
        (sub) =>
          sub.status === SubscriptionStatus.ACTIVE &&
          sub.expiresAt &&
          sub.expiresAt > now &&
          sub.postsUsed < (sub.package?.postsQuota ?? 0),
      ) ?? null
    );
  }

  /** Request a feed package (pending admin approval). */
  async requestSubscription(userId: string, packageId: string) {
    const pkg = await this.prisma.feedPackage.findUnique({ where: { id: packageId } });
    if (!pkg || !pkg.isActive) {
      throw new NotFoundException('بسته فید یافت نشد یا غیرفعال است');
    }
    const pending = await this.prisma.userFeedSubscription.findFirst({
      where: { userId, status: SubscriptionStatus.PENDING },
    });
    if (pending) {
      throw new BadRequestException('یک درخواست اشتراک فید در انتظار تأیید دارید');
    }
    const created = await this.prisma.userFeedSubscription.create({
      data: { userId, packageId },
    });
    await this.notifications.notifyAdmins({
      category: 'FEED',
      title: 'درخواست اشتراک فید جدید',
      body: `درخواست بسته «${pkg.name}» برای فید ثبت شد.`,
      type: NotificationType.INFO,
      link: '/admin?section=feeds',
      actorId: userId,
    });
    await this.activity.log({
      action: 'FEED_SUBSCRIPTION_REQUESTED',
      summary: `درخواست اشتراک فید «${pkg.name}»`,
      entityType: 'FEED',
      entityId: created.id,
    });
    return created;
  }

  /** Create a feed post (enters the moderation queue). */
  async createPost(userId: string, dto: CreateFeedPostDto) {
    const maxImages = await this.settings.getFeedMaxImages();
    if (dto.images.length > maxImages) {
      throw new BadRequestException(
        `حداکثر ${maxImages} تصویر برای هر پست مجاز است`,
      );
    }
    if (!dto.body?.trim() && dto.images.length === 0) {
      throw new BadRequestException('پست باید متن یا تصویر داشته باشد');
    }
    const subscription = await this.requirePublishable(userId);
    if (dto.topicId) {
      const topic = await this.prisma.feedTopic.findUnique({
        where: { id: dto.topicId },
      });
      if (!topic || !topic.isActive) {
        throw new BadRequestException('موضوع انتخاب‌شده معتبر نیست');
      }
    }

    const post = await this.prisma.feedPost.create({
      data: {
        userId,
        body: dto.body?.trim() || null,
        images: dto.images,
        topicId: dto.topicId ?? null,
        status: NewsStatus.PENDING,
      },
    });
    // Reserve the quota now so a user cannot fire many pending posts at once.
    await this.prisma.userFeedSubscription.update({
      where: { id: subscription.id },
      data: { postsUsed: { increment: 1 } },
    });
    await this.notifications.notifyAdmins({
      category: 'FEED',
      title: 'پست فید جدید در انتظار تأیید',
      body: 'یک پست فید برای بررسی ثبت شد.',
      type: NotificationType.INFO,
      link: '/admin?section=feeds',
      actorId: userId,
    });
    await this.activity.log({
      action: 'FEED_POST_CREATED',
      summary: 'ثبت پست فید جدید',
      entityType: 'FEED',
      entityId: post.id,
    });
    return post;
  }

  /** Ensure the user has an active subscription with quota left. */
  private async requirePublishable(userId: string) {
    const subs = await this.prisma.userFeedSubscription.findMany({
      where: { userId },
      include: { package: true },
      orderBy: { requestedAt: 'desc' },
    });
    const now = new Date();
    const active = subs.find(
      (sub) =>
        sub.status === SubscriptionStatus.ACTIVE &&
        sub.expiresAt &&
        sub.expiresAt > now &&
        sub.postsUsed < sub.package.postsQuota,
    );
    if (!active) {
      throw new ForbiddenException(
        'برای انتشار پست، ابتدا یک اشتراک فید فعال با ظرفیت باقی‌مانده تهیه کنید',
      );
    }
    return active;
  }

  async updatePost(userId: string, id: string, dto: CreateFeedPostDto) {
    const post = await this.prisma.feedPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('پست فید یافت نشد');
    if (post.userId !== userId) {
      throw new ForbiddenException('دسترسی به این پست مجاز نیست');
    }
    const maxImages = await this.settings.getFeedMaxImages();
    if (dto.images.length > maxImages) {
      throw new BadRequestException(`حداکثر ${maxImages} تصویر مجاز است`);
    }
    const updated = await this.prisma.feedPost.update({
      where: { id },
      data: {
        body: dto.body?.trim() || null,
        images: dto.images,
        topicId: dto.topicId ?? null,
        // An edit re-enters the moderation queue.
        status: NewsStatus.PENDING,
        isPublished: false,
        publishedAt: null,
        reason: null,
      },
    });
    this.facetsCache.invalidate('dir:feeds');
    return updated;
  }

  async removePost(userId: string, id: string) {
    const post = await this.prisma.feedPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('پست فید یافت نشد');
    if (post.userId !== userId) {
      throw new ForbiddenException('دسترسی به این پست مجاز نیست');
    }
    await this.prisma.feedPost.delete({ where: { id } });
    this.facetsCache.invalidate('dir:feeds');
    return { deleted: true };
  }

  // ------------------------------------------------------------------
  //  admin
  // ------------------------------------------------------------------

  async adminListPosts(status?: NewsStatus) {
    const posts = await this.prisma.feedPost.findMany({
      where: status ? { status } : {},
      include: feedPostInclude,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return posts.map(({ _count, ...post }) => ({ ...post, likeCount: _count.likes }));
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
    // A rejected post returns its quota slot to the user.
    if (!approved) {
      const active = await this.prisma.userFeedSubscription.findFirst({
        where: {
          userId: post.userId,
          status: SubscriptionStatus.ACTIVE,
          postsUsed: { gt: 0 },
        },
        orderBy: { requestedAt: 'desc' },
      });
      if (active) {
        await this.prisma.userFeedSubscription.update({
          where: { id: active.id },
          data: { postsUsed: { decrement: 1 } },
        });
      }
    }
    await this.notifications.notify({
      userId: post.userId,
      title: approved ? 'پست فید شما تأیید شد' : 'پست فید شما رد شد',
      body: approved
        ? 'پست شما در فید منتشر شد.'
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
      },
    });
    await this.notifications.notify({
      userId: sub.userId,
      title: approved ? 'اشتراک فید شما فعال شد' : 'درخواست اشتراک فید رد شد',
      body: approved
        ? `بسته «${sub.package.name}» فعال شد و می‌توانید پست ثبت کنید.`
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
