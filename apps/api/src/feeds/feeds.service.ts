import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  FeedTagKind,
  NewsStatus,
  NotificationType,
  Prisma,
  SubscriptionStatus,
  WalletEntryKind,
} from '@prisma/client';

import { ActivityService } from '../activity/activity.service';
import { FacetsCacheService } from '../common/facets-cache.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { assertOwnedMediaUrls } from '../uploads/media-url';
import { WalletService } from '../wallet/wallet.service';
import { CreateFeedPostDto } from './dto/feed.dto';
import { FeedsAdminService } from './feeds-admin.service';
import { FeedsDirectoryService } from './feeds-directory.service';
import {
  feedPostInclude,
  feedTagInclude,
  projectFeedTag,
} from './feeds.shared';

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
    private readonly directory: FeedsDirectoryService,
    private readonly admin: FeedsAdminService,
    private readonly wallet: WalletService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.admin.ensureDefaultPackages();
    } catch {
      // tables may not exist on a very first boot; a later boot seeds them
    }
  }

  /** Starter packages from the spec: 5 posts / 10 posts, both monthly. */
  async myOverview(userId: string) {
    const [
      packages,
      subscriptions,
      posts,
      topics,
      maxImages,
      maxImageKb,
      tagPrice,
      biolinks,
      cards,
    ] =
      await Promise.all([
        this.admin.listPackages(true),
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
          include: { ...feedPostInclude, ...feedTagInclude },
        }),
        this.directory.listTopics(true),
        this.settings.getFeedMaxImages(),
        this.settings.getFeedMaxImageKb(),
        this.settings.getFeedTagPrice(),
        // The author's own items available to tag (id + label only).
        this.prisma.biolink.findMany({
          where: { userId, isPublished: true, status: 'APPROVED' },
          select: { id: true, fullName: true, company: true, slug: true },
          orderBy: { updatedAt: 'desc' },
          take: 50,
        }),
        this.prisma.businessCard.findMany({
          where: { userId, isPublished: true, status: 'APPROVED' },
          select: { id: true, fullName: true, company: true, slug: true },
          orderBy: { updatedAt: 'desc' },
          take: 50,
        }),
      ]);

    return {
      packages,
      subscriptions,
      posts: posts.map(({ _count, ...post }) => ({
        ...projectFeedTag(post),
        likeCount: _count.likes,
      })),
      topics,
      active: this.activeSubscription(subscriptions),
      // When the current subscription is still active but its quota is used up,
      // the user may *upgrade* to a bigger package. `exhausted` drives the
      // «ارتقا» panel; `upgradePackageIds` are the only packages they may pick
      // (strictly larger quota, so the subscription can only go up).
      exhausted: this.exhaustedSubscription(subscriptions, posts.length),
      upgradePackageIds: this.upgradePackageIds(subscriptions, posts.length, packages),
      limits: { maxImages, maxImageKb },
      tagPrice,
      taggableBiolinks: biolinks,
      taggableCards: cards,
    };
  }

  /**
   * Published feed posts the user has saved, newest save first, paginated with
   * the admin-controlled `myListPageSize` setting — mirrors the saved lists of
   * the other directories so «ذخیره‌شده‌های من» can show a feed tab.
   */
  async findMySaved(userId: string, page = 1, limitOverride?: number) {
    const limit = limitOverride ?? (await this.settings.getMyListPageSize());
    const currentPage = Math.max(1, page);

    const [saves, total] = await Promise.all([
      this.prisma.feedSave.findMany({
        where: { userId },
        include: { feedPost: { include: { ...feedPostInclude, ...feedTagInclude } } },
        orderBy: { createdAt: 'desc' },
        skip: (currentPage - 1) * limit,
        take: limit,
      }),
      this.prisma.feedSave.count({ where: { userId } }),
    ]);

    return {
      items: saves
        .filter((save) => save.feedPost)
        .map((save) => {
          const { _count, ...post } = save.feedPost;
          return {
            ...projectFeedTag(post),
            likeCount: _count.likes,
            savedAt: save.createdAt,
          };
        }),
      meta: {
        page: currentPage,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNext: currentPage * limit < total,
        hasPrev: currentPage > 1,
      },
    };
  }

  /**
   * 1-based rank of a feed post inside the published feed directory, plus the
   * page it lands on with the current page size — mirrors the biolink/card
   * «افزایش بازدید» panel so a boosted post can show 55 / page 3.
   */
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

  /**
   * The subscription whose quota is used up while it is still inside its paid
   * window. That is the state where the user may only *upgrade* (never buy a
   * smaller/equal package).
   */
  private exhaustedSubscription(
    subscriptions: Array<{
      id: string;
      status: SubscriptionStatus;
      expiresAt: Date | null;
      postsUsed: number;
      package?: { id: string; name: string; postsQuota: number } | null;
    }>,
    postCount: number,
  ) {
    const now = new Date();
    return (
      subscriptions.find((sub) => {
        if (
          sub.status !== SubscriptionStatus.ACTIVE ||
          !sub.expiresAt ||
          sub.expiresAt <= now
        ) {
          return false;
        }
        const quota = sub.package?.postsQuota ?? 0;
        return sub.postsUsed >= quota || postCount >= quota;
      }) ?? null
    );
  }

  /**
   * Package ids the user is allowed to switch to right now. With an exhausted
   * active subscription only strictly bigger packages qualify (an upgrade);
   * otherwise every active package is a valid first-time purchase.
   */
  private upgradePackageIds(
    subscriptions: Array<{
      id: string;
      status: SubscriptionStatus;
      expiresAt: Date | null;
      postsUsed: number;
      package?: { id: string; name: string; postsQuota: number } | null;
    }>,
    postCount: number,
    packages: Array<{ id: string; postsQuota: number }>,
  ): string[] {
    const current = this.exhaustedSubscription(subscriptions, postCount);
    if (!current) return [];
    const currentQuota = current.package?.postsQuota ?? 0;
    return packages
      .filter((pkg) => pkg.postsQuota > currentQuota)
      .map((pkg) => pkg.id);
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

    // When the user's current subscription has run out of quota, they may only
    // move *up* to a package with a larger post quota.
    const currentSubs = await this.prisma.userFeedSubscription.findMany({
      where: { userId },
      include: { package: { select: { id: true, name: true, postsQuota: true } } },
      orderBy: { requestedAt: 'desc' },
    });
    const postCount = await this.prisma.feedPost.count({ where: { userId } });
    const exhausted = this.exhaustedSubscription(currentSubs, postCount);
    if (exhausted) {
      const currentQuota = exhausted.package?.postsQuota ?? 0;
      if (pkg.postsQuota <= currentQuota) {
        throw new BadRequestException(
          `ظرفیت اشتراک فعلی شما پر شده است؛ فقط ارتقا به بسته‌ای با ظرفیت بیشتر از ${currentQuota.toLocaleString('fa-IR')} پست مجاز است`,
        );
      }
    }

    const created = await this.prisma.userFeedSubscription.create({
      data: { userId, packageId },
    });
    try {
      if (pkg.price > 0 && (await this.settings.isFeatureEnabled('featureWallet'))) {
        await this.wallet.charge({
          userId,
          kind: WalletEntryKind.FEED_PACKAGE,
          amount: pkg.price,
          title: `خرید بسته فید «${pkg.name}»`,
          sourceType: 'FEED_PACKAGE',
          sourceId: created.id,
          idempotencyKey: `feed-package:${created.id}`,
        });
      }
    } catch (error) {
      // Never leave a paid package request behind without its debt.
      await this.prisma.userFeedSubscription
        .delete({ where: { id: created.id } })
        .catch(() => undefined);
      throw error;
    }
    await this.notifications.notifyAdmins({
      category: 'FEED',
      scope: 'FEED',
      title: exhausted ? 'درخواست ارتقای اشتراک فید' : 'درخواست اشتراک فید جدید',
      body: `درخواست بسته «${pkg.name}» برای فید ثبت شد.`,
      type: NotificationType.INFO,
      link: '/jga4rm8j?section=feeds',
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
    await this.wallet.assertSettled(
      userId,
      'برای ثبت پست فید، ابتدا بدهی کیف پول خود را تسویه کنید.',
    );
    // Admin off-switch for the whole «پست کاربران» feature.
    await this.settings.assertFeatureEnabled(
      'featureFeedPosts',
      'انتشار پست توسط کاربران موقتاً توسط مدیر غیرفعال شده است.',
    );
    const maxImages = await this.settings.getFeedMaxImages();
    if (dto.images.length > maxImages) {
      throw new BadRequestException(
        `حداکثر ${maxImages} تصویر برای هر پست مجاز است`,
      );
    }
    assertOwnedMediaUrls(dto.images, 'تصویر پست');
    if (!dto.body?.trim() && dto.images.length === 0) {
      throw new BadRequestException('پست باید متن یا تصویر داشته باشد');
    }
    if (dto.topicId) {
      const topic = await this.prisma.feedTopic.findUnique({
        where: { id: dto.topicId },
      });
      if (!topic || !topic.isActive) {
        throw new BadRequestException('موضوع انتخاب‌شده معتبر نیست');
      }
    }

    // Tagging one of the author's own items is the paid extra: validate the
    // target belongs to them and snapshot the current fee. The tag stays hidden
    // until an admin confirms the (currently simulated) payment.
    const tag = await this.resolveTagTarget(userId, dto);
    const tagPrice = tag ? await this.settings.getFeedTagPrice() : null;

    const post = await this.prisma.feedPost.create({
      data: {
        userId,
        body: dto.body?.trim() || null,
        images: dto.images,
        topicId: dto.topicId ?? null,
        tagKind: tag?.kind ?? null,
        tagBiolinkId: tag?.biolinkId ?? null,
        tagBusinessCardId: tag?.businessCardId ?? null,
        tagPrice,
        tagPaid: false,
        status: NewsStatus.PENDING,
      },
    });
    if (
      tag &&
      (tagPrice ?? 0) > 0 &&
      (await this.settings.isFeatureEnabled('featureWallet'))
    ) {
      try {
        await this.wallet.charge({
          userId,
          kind: WalletEntryKind.FEED_TAG,
          amount: tagPrice ?? 0,
          title: 'تگ کارت/بیولینک روی پست فید',
          sourceType: 'FEED_POST',
          sourceId: post.id,
          idempotencyKey: `feed-tag:${post.id}:${tag.kind}:${tag.biolinkId ?? tag.businessCardId}`,
        });
      } catch (error) {
        // The post was just created for this tag; drop it rather than keep a
        // free paid tag.
        await this.prisma.feedPost.delete({ where: { id: post.id } }).catch(() => undefined);
        throw error;
      }
    }
    await this.notifications.notifyAdmins({
      category: 'FEED',
      scope: 'FEED',
      title: 'پست فید جدید در انتظار تأیید',
      body: tag
        ? 'یک پست فید همراه با تگ کارت/بیولینک برای بررسی ثبت شد.'
        : 'یک پست فید برای بررسی ثبت شد.',
      type: NotificationType.INFO,
      link: '/jga4rm8j?section=feeds',
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

  /**
   * Validates the optional tag target. The tag must point at one of the
   * author's *own* published items; anything else is rejected so a post cannot
   * be used to promote someone else's card. Returns the column values to store.
   */
  private async resolveTagTarget(
    userId: string,
    dto: CreateFeedPostDto,
  ): Promise<
    | { kind: FeedTagKind; biolinkId: string | null; businessCardId: string | null }
    | null
  > {
    if (!dto.tagKind) return null;
    if (!dto.tagTargetId) {
      throw new BadRequestException('شناسه مورد تگ‌شده الزامی است');
    }
    if (dto.tagKind === 'BIOLINK') {
      const biolink = await this.prisma.biolink.findUnique({
        where: { id: dto.tagTargetId },
        select: { id: true, userId: true },
      });
      if (!biolink || biolink.userId !== userId) {
        throw new BadRequestException('بیولینک انتخاب‌شده معتبر نیست');
      }
      return { kind: FeedTagKind.BIOLINK, biolinkId: biolink.id, businessCardId: null };
    }
    const card = await this.prisma.businessCard.findUnique({
      where: { id: dto.tagTargetId },
      select: { id: true, userId: true },
    });
    if (!card || card.userId !== userId) {
      throw new BadRequestException('کارت ویزیت انتخاب‌شده معتبر نیست');
    }
    return { kind: FeedTagKind.BUSINESS_CARD, biolinkId: null, businessCardId: card.id };
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
    assertOwnedMediaUrls(dto.images, 'تصویر پست');
    // Re-resolve the tag. If the tag target changed, the fee has to be settled
    // again; keeping the same target preserves a already-paid tag.
    const tag = await this.resolveTagTarget(userId, dto);
    const sameTag =
      tag &&
      ((tag.kind === 'BIOLINK' && post.tagBiolinkId === tag.biolinkId) ||
        (tag.kind === 'BUSINESS_CARD' &&
          post.tagBusinessCardId === tag.businessCardId));
    const tagPrice = tag ? await this.settings.getFeedTagPrice() : null;
    const updated = await this.prisma.feedPost.update({
      where: { id },
      data: {
        body: dto.body?.trim() || null,
        images: dto.images,
        topicId: dto.topicId ?? null,
        tagKind: tag?.kind ?? null,
        tagBiolinkId: tag?.biolinkId ?? null,
        tagBusinessCardId: tag?.businessCardId ?? null,
        tagPrice,
        tagPaid: sameTag ? post.tagPaid : false,
        // An edit re-enters the moderation queue.
        status: NewsStatus.PENDING,
        isPublished: false,
        publishedAt: null,
        reason: null,
      },
    });
    if (
      tag &&
      !sameTag &&
      (tagPrice ?? 0) > 0 &&
      (await this.settings.isFeatureEnabled('featureWallet'))
    ) {
      await this.wallet.charge({
        userId,
        kind: WalletEntryKind.FEED_TAG,
        amount: tagPrice ?? 0,
        title: 'تگ کارت/بیولینک روی پست فید',
        sourceType: 'FEED_POST',
        sourceId: post.id,
        idempotencyKey: `feed-tag:${post.id}:${tag.kind}:${tag.biolinkId ?? tag.businessCardId}`,
      });
    }
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

  /**
   * Moderator/admin edit: fix a post's text, images or topic in place without
   * bouncing it back to the review queue (mirrors the news admin edit).
   */
  async updatePostContent(
    id: string,
    dto: { body?: string; images?: string[]; topicId?: string | null },
  ) {
    const post = await this.prisma.feedPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('پست فید یافت نشد');

    const data: Prisma.FeedPostUpdateInput = {};
    if (dto.body !== undefined) data.body = dto.body.trim() || null;
    if (dto.images !== undefined) {
      const maxImages = await this.settings.getFeedMaxImages();
      if (dto.images.length > maxImages) {
        throw new BadRequestException(`حداکثر ${maxImages} تصویر مجاز است`);
      }
      data.images = dto.images;
    }
    if (dto.topicId !== undefined) {
      data.topic = dto.topicId ? { connect: { id: dto.topicId } } : { disconnect: true };
    }

    const updated = await this.prisma.feedPost.update({ where: { id }, data });
    this.facetsCache.invalidate('dir:feeds');
    return updated;
  }
}
