import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BiolinkStatus, Prisma } from '@prisma/client';

import { FacetsCacheService } from '../common/facets-cache.service';
import { paginationMeta } from '../common/pagination-meta';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CreateBusinessReviewDto } from './dto/create-business-review.dto';

/** Reviews shown per page on the public business profile. */
const REVIEWS_PAGE_SIZE = 10;

@Injectable()
export class BusinessReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly facetsCache: FacetsCacheService,
  ) {}

  /** Published business card targeted by a review route, or 404. */
  private async findReviewable(slug: string) {
    const card = await this.prisma.businessCard.findFirst({
      where: { slug, status: BiolinkStatus.APPROVED, isPublished: true },
      select: { id: true, userId: true, fullName: true },
    });
    if (!card) {
      throw new NotFoundException('کسب‌وکار مورد نظر یافت نشد یا منتشر نشده است');
    }
    return card;
  }

  /** Average, count and per-star distribution of visible reviews. */
  async summary(businessCardId: string) {
    const [aggregate, grouped] = await Promise.all([
      this.prisma.businessReview.aggregate({
        where: { businessCardId, isHidden: false },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      this.prisma.businessReview.groupBy({
        by: ['rating'],
        where: { businessCardId, isHidden: false },
        _count: { _all: true },
      }),
    ]);
    const distribution: Record<string, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of grouped) {
      distribution[String(row.rating)] = row._count._all;
    }
    return {
      average: Number((aggregate._avg.rating ?? 0).toFixed(2)),
      count: aggregate._count._all,
      distribution,
    };
  }

  /** Paginated public reviews, newest first. `viewerId` marks the viewer's own. */
  async listPublic(slug: string, page = 1, limit = REVIEWS_PAGE_SIZE, viewerId?: string) {
    const card = await this.findReviewable(slug);
    const currentPage = Math.max(1, page);
    const pageSize = Math.min(50, Math.max(1, limit));
    const [rows, total, summary] = await Promise.all([
      this.prisma.businessReview.findMany({
        where: { businessCardId: card.id, isHidden: false },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          userId: true,
          authorName: true,
          rating: true,
          comment: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.businessReview.count({
        where: { businessCardId: card.id, isHidden: false },
      }),
      this.summary(card.id),
    ]);
    return {
      summary,
      items: rows.map(({ userId, ...review }) => ({
        ...review,
        mine: Boolean(viewerId && userId === viewerId),
      })),
      meta: {
        ...paginationMeta(currentPage, pageSize, total),
      },
    };
  }

  /** The signed-in user's own review for this business (or null). */
  async findMine(slug: string, userId: string) {
    const card = await this.findReviewable(slug);
    const [review, summary] = await Promise.all([
      this.prisma.businessReview.findUnique({
        where: { businessCardId_userId: { businessCardId: card.id, userId } },
        select: {
          id: true,
          authorName: true,
          rating: true,
          comment: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.summary(card.id),
    ]);
    return { review, summary };
  }

  /**
   * Create the viewer's review, or update it when they already reviewed this
   * business. Aggregates are recomputed in the same transaction so the public
   * stars never drift from the underlying rows.
   */
  async save(slug: string, userId: string, dto: CreateBusinessReviewDto) {
    await this.settings.assertFeatureEnabled(
      'featureBusinessReviews',
      'ثبت دیدگاه و امتیاز موقتاً توسط مدیر غیرفعال شده است.',
    );
    const card = await this.findReviewable(slug);
    if (card.userId === userId) {
      throw new BadRequestException('شما نمی‌توانید برای کسب‌وکار خودتان دیدگاه ثبت کنید');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });
    const authorName = user?.fullName?.trim() || 'کاربر آلوشمال';
    const comment = dto.comment?.trim() || null;

    const review = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.businessReview.upsert({
        where: { businessCardId_userId: { businessCardId: card.id, userId } },
        create: {
          businessCardId: card.id,
          userId,
          authorName,
          rating: dto.rating,
          comment,
        },
        update: { authorName, rating: dto.rating, comment },
        select: {
          id: true,
          authorName: true,
          rating: true,
          comment: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      await this.syncAggregate(tx, card.id);
      return saved;
    });
    this.facetsCache.invalidateDirectory('businesscard');
    return { review: { ...review, mine: true }, summary: await this.summary(card.id) };
  }

  /** Delete the viewer's own review and refresh the public aggregate. */
  async removeMine(slug: string, userId: string) {
    await this.settings.assertFeatureEnabled(
      'featureBusinessReviews',
      'ثبت دیدگاه و امتیاز موقتاً توسط مدیر غیرفعال شده است.',
    );
    const card = await this.findReviewable(slug);
    const existing = await this.prisma.businessReview.findUnique({
      where: { businessCardId_userId: { businessCardId: card.id, userId } },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('دیدگاه شما برای این کسب‌وکار ثبت نشده است');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.businessReview.delete({ where: { id: existing.id } });
      await this.syncAggregate(tx, card.id);
    });
    this.facetsCache.invalidateDirectory('businesscard');
    return { deleted: true, summary: await this.summary(card.id) };
  }

  private async syncAggregate(tx: Prisma.TransactionClient, businessCardId: string) {
    const aggregate = await tx.businessReview.aggregate({
      where: { businessCardId, isHidden: false },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await tx.businessCard.update({
      where: { id: businessCardId },
      data: {
        ratingAvg: aggregate._avg.rating ?? 0,
        ratingCount: aggregate._count._all,
      },
    });
  }
}
