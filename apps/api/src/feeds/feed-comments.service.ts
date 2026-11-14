import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NewsStatus, NotificationType, Prisma } from '@prisma/client';

import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CreateFeedCommentDto } from './dto/feed.dto';

/**
 * Comments on feed posts (public listing, owner creation and the admin
 * moderation queue), split out of the large `FeedsService`.
 */
@Injectable()
export class FeedCommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityService,
  ) {}

  // ---- Comments («کامنت کاربران») --------------------------------------
  // Comments are moderated: a new comment starts PENDING and is only shown
  // publicly once an admin approves it. Other visitors never see a pending or
  // rejected comment; the author sees their own with its status.

  private readonly commentInclude = {
    user: { select: { id: true, fullName: true, email: true } },
  } satisfies Prisma.FeedCommentInclude;

  /** Public comment list for a post: approved only. */
  async listComments(postId: string, page = 1, limit = 20) {
    const post = await this.prisma.feedPost.findFirst({
      where: { id: postId, status: NewsStatus.APPROVED, isPublished: true },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('پست فید یافت نشد');
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const safePage = Math.max(page, 1);
    const where = { feedPostId: postId, status: NewsStatus.APPROVED };
    const [items, total] = await Promise.all([
      this.prisma.feedComment.findMany({
        where,
        include: this.commentInclude,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      this.prisma.feedComment.count({ where }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    return {
      items,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        hasNext: safePage < totalPages,
        hasPrev: safePage > 1,
      },
    };
  }

  /**
   * Comment list for the current user's own view: their approved comments plus
   * their own pending/rejected ones (so they can see the moderation status).
   */
  async listMyComments(postId: string, userId: string) {
    const post = await this.prisma.feedPost.findFirst({
      where: { id: postId },
      select: { id: true, userId: true, status: true, isPublished: true },
    });
    if (!post || (post.status !== NewsStatus.APPROVED && post.userId !== userId)) {
      throw new NotFoundException('پست فید یافت نشد');
    }
    const [approved, mine] = await Promise.all([
      this.prisma.feedComment.findMany({
        where: { feedPostId: postId, status: NewsStatus.APPROVED },
        include: this.commentInclude,
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prisma.feedComment.findMany({
        where: { feedPostId: postId, userId, status: { not: NewsStatus.APPROVED } },
        include: this.commentInclude,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    const seen = new Set<string>();
    const items = [...mine, ...approved].filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { items, mineCount: mine.length, approvedCount: approved.length };
  }

  /** Create a comment (PENDING) and notify admins for moderation. */
  async createComment(userId: string, postId: string, dto: CreateFeedCommentDto) {
    await this.settings.assertFeatureEnabled(
      'featureFeedComments',
      'ثبت کامنت موقتاً توسط مدیر غیرفعال شده است.',
    );
    const body = dto.body.trim();
    if (!body) throw new BadRequestException('متن کامنت خالی است');
    const post = await this.prisma.feedPost.findFirst({
      where: { id: postId, status: NewsStatus.APPROVED, isPublished: true },
      select: { id: true, userId: true },
    });
    if (!post) throw new NotFoundException('پست فید یافت نشد');

    const comment = await this.prisma.feedComment.create({
      data: { feedPostId: postId, userId, body, status: NewsStatus.PENDING },
      include: this.commentInclude,
    });
    await this.notifications.notifyAdmins({
      category: 'FEED_COMMENT',
      scope: 'FEED',
      title: 'کامنت جدید در انتظار تأیید',
      body: 'یک کامنت برای بررسی ثبت شد.',
      type: NotificationType.INFO,
      link: '/jga4rm8j?section=comments',
      actorId: userId,
    });
    // Tell the post author someone replied (best-effort).
    if (post.userId !== userId) {
      await this.notifications.notify({
        userId: post.userId,
        scope: 'FEED',
        title: 'کامنت تازه روی پست شما',
        body: 'یک کامنت جدید برای پست شما ثبت شد و پس از تأیید مدیر نمایش داده می‌شود.',
        type: NotificationType.INFO,
        link: `/feeds/${postId}`,
        actorId: userId,
      });
    }
    await this.activity.log({
      action: 'FEED_COMMENT_CREATED',
      summary: 'ثبت کامنت روی پست فید',
      entityType: 'FEED',
      entityId: postId,
    });
    return comment;
  }

  /** Delete own comment (only before it is approved, or by the owner at all). */
  async removeComment(userId: string, commentId: string) {
    const comment = await this.prisma.feedComment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('کامنت یافت نشد');
    if (comment.userId !== userId) {
      throw new ForbiddenException('اجازه‌ی حذف این کامنت را ندارید');
    }
    await this.prisma.feedComment.delete({ where: { id: commentId } });
    return { removed: true };
  }

  /** Admin: list comments for moderation, optionally filtered by status. */
  async adminListComments(status?: NewsStatus, page = 1, limit = 30) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const where = status ? { status } : {};
    const [items, total] = await Promise.all([
      this.prisma.feedComment.findMany({
        where,
        include: {
          ...this.commentInclude,
          feedPost: {
            select: { id: true, body: true, images: true, user: { select: { fullName: true, email: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      this.prisma.feedComment.count({ where }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    return {
      items,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        hasNext: safePage < totalPages,
        hasPrev: safePage > 1,
      },
    };
  }

  /** Admin: approve or reject a comment. */
  async moderateComment(
    adminId: string,
    commentId: string,
    decision: NewsStatus,
    reason?: string,
  ) {
    if (decision !== NewsStatus.APPROVED && decision !== NewsStatus.REJECTED) {
      throw new BadRequestException('تصمیم نامعتبر است');
    }
    const comment = await this.prisma.feedComment.findUnique({
      where: { id: commentId },
      include: { feedPost: { select: { id: true } } },
    });
    if (!comment) throw new NotFoundException('کامنت یافت نشد');
    const updated = await this.prisma.feedComment.update({
      where: { id: commentId },
      data: {
        status: decision,
        reason: decision === NewsStatus.REJECTED ? (reason ?? null) : null,
        decidedAt: new Date(),
        decidedById: adminId,
      },
    });
    await this.notifications.notify({
      userId: comment.userId,
      scope: 'FEED',
      title:
        decision === NewsStatus.APPROVED
          ? 'کامنت شما تأیید شد'
          : 'کامنت شما تأیید نشد',
      body:
        decision === NewsStatus.APPROVED
          ? 'کامنت شما روی پست فید منتشر شد.'
          : reason ?? 'کامنت شما توسط مدیر تأیید نشد.',
      type: decision === NewsStatus.APPROVED ? NotificationType.SUCCESS : NotificationType.WARNING,
      link: `/feeds/${comment.feedPostId}`,
      actorId: adminId,
    });
    return updated;
  }

  /** Admin: delete any comment. */
  async adminRemoveComment(commentId: string) {
    const comment = await this.prisma.feedComment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });
    if (!comment) throw new NotFoundException('کامنت یافت نشد');
    await this.prisma.feedComment.delete({ where: { id: commentId } });
    return { removed: true };
  }

  /** Counts of comments by status, for the admin badge. */
  async commentCounts() {
    const rows = await this.prisma.feedComment.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0 } as Record<NewsStatus, number>;
    for (const row of rows) counts[row.status] = row._count._all;
    return counts;
  }
}
