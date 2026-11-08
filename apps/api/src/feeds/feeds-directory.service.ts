import { Injectable, NotFoundException } from '@nestjs/common';
import { NewsStatus, Prisma } from '@prisma/client';

import { FacetsCacheService } from '../common/facets-cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { ListFeedQueryDto } from './dto/feed.dto';
import { feedPostInclude, feedTagInclude, projectFeedTag } from './feeds.shared';

const DIRECTORY_CACHE_TTL_MS = (() => {
  const parsed = Number(process.env.DIRECTORY_CACHE_TTL_MS ?? 15_000);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 15_000;
})();

/**
 * Public read-path of the «فیدها» directory: the paginated/cached directory
 * list, a single post, visitor likes/saves, the topic vocabulary and the
 * directory rank used by «افزایش بازدید». Split out of `FeedsService` so the
 * write/moderation flows stay in one place.
 */
@Injectable()
export class FeedsDirectoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly facetsCache: FacetsCacheService,
  ) {}

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
        ...projectFeedTag(item),
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
        include: { ...feedPostInclude, ...feedTagInclude },
        // Paid directory ads float above the plain chronological rows. A boost
        // («پله») re-pins the post (`pinnedAt = now` on approval), so it already
        // sits at the top of the chronological rows and drops down as soon as a
        // newer post appears — exactly like a freshly created post.
        orderBy: [
          { adDirectoryUntil: { sort: 'desc', nulls: 'last' } },
          { pinnedAt: 'desc' },
          { id: 'desc' },
        ],
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

  /**
   * Turns the joined tag relations into one `tag` object. The tag is only
   * exposed once its fee has been paid (`tagPaid`), so an unpaid tag never
   * leaks a link on the public feed; the owning panels still see the raw
   * `tag*` columns for their own posts.
   */

  async publicPost(id: string, visitorKey?: string, userId?: string) {
    const post = await this.prisma.feedPost.findFirst({
      where: { id, status: NewsStatus.APPROVED, isPublished: true },
      include: { ...feedPostInclude, ...feedTagInclude },
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
    return {
      ...projectFeedTag(rest),
      likeCount: _count.likes,
      liked,
      saved,
    };
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

  async directoryRank(postId: string) {
    const post = await this.prisma.feedPost.findUnique({
      where: { id: postId },
      select: { id: true, pinnedAt: true, status: true, isPublished: true },
    });
    if (!post || post.status !== NewsStatus.APPROVED || !post.isPublished) {
      return { rank: null, page: null, total: null, pageSize: null };
    }
    const [total, pageSize, ahead] = await Promise.all([
      this.prisma.feedPost.count({
        where: { status: NewsStatus.APPROVED, isPublished: true },
      }),
      this.settings.getDirectoryPageSize(),
      this.prisma.feedPost.count({
        where: {
          status: NewsStatus.APPROVED,
          isPublished: true,
          OR: [
            { pinnedAt: { gt: post.pinnedAt } },
            { pinnedAt: post.pinnedAt, id: { gt: post.id } },
          ],
        },
      }),
    ]);
    const rank = ahead + 1;
    return {
      rank,
      page: Math.ceil(rank / pageSize),
      total,
      pageSize,
    };
  }

  /** The active (approved, unexpired, quota left) subscription, if any. */
}
