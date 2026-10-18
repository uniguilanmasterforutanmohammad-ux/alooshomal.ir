import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdPlacement,
  BiolinkStatus,
  BoostStatus,
  ContentDecisionKind,
  ModerationDecision,
  NewsStatus,
  SubscriptionStatus,
} from '@prisma/client';

import { AdminService } from '../admin/admin.service';
import { ModerateBiolinkDto } from '../admin/dto/moderate-biolink.dto';
import { UpdateBiolinkDto } from '../biolinks/dto/update-biolink.dto';
import { UpdateBusinessCardDto } from '../businesscards/dto/update-business-card.dto';
import { AdsService } from '../ads/ads.service';
import { BoostsService } from '../boosts/boosts.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { FeedsService } from '../feeds/feeds.service';
import { UpdateNewsAdminDto } from '../news/dto/update-news-admin.dto';
import { NewsService } from '../news/news.service';
import { PrismaService } from '../prisma/prisma.service';
import { MODERATOR_SCOPES, ModeratorScope } from '../auth/moderator-scopes';
import { CONTENT_SCOPE_TO_DECISION } from '../auth/moderator-scope-map';
import { ContentDecisionService } from './content-decision.service';
import { ModeratorContentUpdateDto } from './dto/moderator-content.dto';

/** Page size for the infinite-scroll review queues. */
export const MODERATOR_PAGE_SIZE = 10;

export interface ModeratorContext {
  id: string;
  email: string | null;
  fullName: string | null;
  role: 'MODERATOR' | 'ADMIN';
  scopes: ModeratorScope[];
  /** super admins see every queue, regardless of stored scopes */
  isSuperAdmin: boolean;
}

export interface QueuePage {
  items: unknown[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

/**
 * Backs the limited «کاربر ادمین» review panel. Every method takes the caller
 * (so it can re-check scopes defensively) plus the requested scope, and
 * delegates the actual mutation to the same services the full admin panel uses
 * — so moderation rules, notifications, points and activity logging all stay
 * identical between a moderator and a super admin.
 *
 * Queues are paginated (10 per page) and the «تأییدشده / ردشده» tabs only list
 * the items *this* reviewer decided (tracked in `content_decisions`).
 */
@Injectable()
export class ModeratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly admin: AdminService,
    private readonly feeds: FeedsService,
    private readonly news: NewsService,
    private readonly subscriptions: SubscriptionsService,
    private readonly boosts: BoostsService,
    private readonly ads: AdsService,
    private readonly decisions: ContentDecisionService,
  ) {}

  /** Resolve the signed-in caller's effective scopes (admins get all). */
  async resolveContext(user: {
    id: string;
    email: string | null;
    role: string;
  }): Promise<ModeratorContext> {
    if (user.role === 'ADMIN') {
      return {
        id: user.id,
        email: user.email,
        fullName: null,
        role: 'ADMIN',
        scopes: [...MODERATOR_SCOPES],
        isSuperAdmin: true,
      };
    }
    const record = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { fullName: true, moderatorScopes: true, role: true, isActive: true },
    });
    const scopes = MODERATOR_SCOPES.filter((scope) =>
      record?.moderatorScopes.includes(scope),
    );
    return {
      id: user.id,
      email: user.email,
      fullName: record?.fullName ?? null,
      role: 'MODERATOR',
      scopes,
      isSuperAdmin: false,
    };
  }

  private assertScope(context: ModeratorContext, scope: ModeratorScope) {
    if (!context.scopes.includes(scope)) {
      throw new ForbiddenException('دسترسی به این بخش برای شما فعال نیست');
    }
  }

  /** Summary counts per queue (pending global; decided = this reviewer). */
  async overview(context: ModeratorContext) {
    const can = (scope: ModeratorScope) => context.scopes.includes(scope);
    const empty = { pending: 0, approved: 0, rejected: 0 };
    const [
      biolinks,
      businessCards,
      feedPosts,
      news,
      subscriptions,
      homeAds,
      directoryAds,
      boosts,
    ] = await Promise.all([
      can('BIOLINK')
        ? this.contentCounts(ContentDecisionKind.BIOLINK, context.id)
        : empty,
      can('BUSINESS_CARD')
        ? this.contentCounts(ContentDecisionKind.BUSINESS_CARD, context.id)
        : empty,
      can('FEED')
        ? this.contentCounts(ContentDecisionKind.FEED, context.id)
        : empty,
      can('NEWS') ? this.contentCounts(ContentDecisionKind.NEWS, context.id) : empty,
      can('SUBSCRIPTION_REQUESTS')
        ? this.subscriptions.requestQueueCounts(context.id)
        : empty,
      can('AD_REQUESTS')
        ? this.ads.requestQueueCounts(context.id, AdPlacement.HOME)
        : empty,
      can('DIRECTORY_AD_REQUESTS')
        ? this.ads.requestQueueCounts(context.id, AdPlacement.DIRECTORY)
        : empty,
      can('BOOST_REQUESTS') ? this.boosts.requestQueueCounts(context.id) : empty,
    ]);
    const toCounts = (c: { pending: number; approved: number; rejected: number }) => c;
    return {
      scopes: context.scopes,
      counts: {
        BIOLINK: toCounts(biolinks),
        BUSINESS_CARD: toCounts(businessCards),
        FEED: toCounts(feedPosts),
        NEWS: toCounts(news),
        SUBSCRIPTION_REQUESTS: toCounts(subscriptions),
        AD_REQUESTS: toCounts(homeAds),
        DIRECTORY_AD_REQUESTS: toCounts(directoryAds),
        BOOST_REQUESTS: toCounts(boosts),
      },
    };
  }

  private async contentCounts(kind: ContentDecisionKind, adminId: string) {
    const [pending, decided] = await Promise.all([
      this.pendingCount(kind),
      this.decisions.counts(kind, adminId),
    ]);
    return { pending, approved: decided.approved, rejected: decided.rejected };
  }

  private pendingCount(kind: ContentDecisionKind) {
    switch (kind) {
      case ContentDecisionKind.BIOLINK:
        return this.prisma.biolink.count({ where: { status: BiolinkStatus.PENDING } });
      case ContentDecisionKind.BUSINESS_CARD:
        return this.prisma.businessCard.count({
          where: { status: BiolinkStatus.PENDING },
        });
      case ContentDecisionKind.FEED:
        return this.prisma.feedPost.count({ where: { status: NewsStatus.PENDING } });
      case ContentDecisionKind.NEWS:
        return this.prisma.newsItem.count({ where: { status: NewsStatus.PENDING } });
      default:
        return Promise.resolve(0);
    }
  }

  /** Feed topics / news categories for the editors. */
  listTopics() {
    return this.feeds.listTopics(false);
  }

  listNewsCategories() {
    return this.news.listCategories(false);
  }

  // ------------------------------------------------------------------
  //  Queue listing (paginated, reviewer-scoped)
  // ------------------------------------------------------------------

  async list(
    context: ModeratorContext,
    scope: ModeratorScope,
    status: NewsStatus,
    page = 1,
  ): Promise<QueuePage> {
    this.assertScope(context, scope);
    const limit = MODERATOR_PAGE_SIZE;
    const safePage = Math.max(1, Math.floor(page) || 1);
    const skip = (safePage - 1) * limit;
    const decidedOnly = status !== NewsStatus.PENDING;

    switch (scope) {
      case 'BIOLINK':
      case 'BUSINESS_CARD':
      case 'FEED':
      case 'NEWS': {
        const kind = CONTENT_SCOPE_TO_DECISION[scope] as ContentDecisionKind;
        return this.listContent(context, kind, scope, status, skip, limit);
      }
      case 'SUBSCRIPTION_REQUESTS': {
        const mapped = toSubscriptionStatus(status);
        const { items, total } = await this.subscriptions.listRequestQueue({
          status: mapped,
          decidedById: decidedOnly ? context.id : undefined,
          skip,
          take: limit,
        });
        return paginate(items, total, safePage, limit);
      }
      case 'AD_REQUESTS':
      case 'DIRECTORY_AD_REQUESTS': {
        const placement =
          scope === 'AD_REQUESTS' ? AdPlacement.HOME : AdPlacement.DIRECTORY;
        const result = await this.ads.listRequestQueueByPlacement({
          placement,
          status: toBoostStatus(status),
          decidedById: decidedOnly ? context.id : undefined,
          skip,
          take: limit,
        });
        return paginate(result.items, result.total, safePage, limit);
      }
      case 'BOOST_REQUESTS': {
        const { items, total } = await this.boosts.listRequestQueue({
          status: toBoostStatus(status),
          decidedById: decidedOnly ? context.id : undefined,
          skip,
          take: limit,
        });
        return paginate(items, total, safePage, limit);
      }
      default:
        return paginate([], 0, safePage, limit);
    }
  }

  private async listContent(
    context: ModeratorContext,
    kind: ContentDecisionKind,
    scope: ModeratorScope,
    status: NewsStatus,
    skip: number,
    limit: number,
  ): Promise<QueuePage> {
    const statusMap =
      scope === 'NEWS' || scope === 'FEED'
        ? (status as unknown as NewsStatus)
        : (status as unknown as BiolinkStatus);

    let where: Record<string, unknown>;
    if (status === NewsStatus.PENDING) {
      where = { status: statusMap };
    } else {
      const approved = status === NewsStatus.APPROVED;
      const itemIds = await this.decisions.decidedItemIds(kind, context.id, approved);
      where = { id: { in: itemIds } };
    }

    const models: Record<string, unknown> = {
      BIOLINK: this.prisma.biolink,
      BUSINESS_CARD: this.prisma.businessCard,
      FEED: this.prisma.feedPost,
      NEWS: this.prisma.newsItem,
    };
    const model = models[kind];

    const include =
      kind === ContentDecisionKind.FEED
        ? { topic: { select: { id: true, name: true } }, user: { select: { id: true, fullName: true, email: true } } }
        : kind === ContentDecisionKind.NEWS
          ? { category: { select: { id: true, name: true } }, author: { select: { id: true, fullName: true, email: true } } }
          : { user: { select: { id: true, fullName: true, email: true } } };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyModel = model as any;
    const [items, total] = await Promise.all([
      anyModel.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      anyModel.count({ where }),
    ]);
    return paginate(items, total, Math.floor(skip / limit) + 1, limit);
  }

  // ---- single item ----

  async getItem(context: ModeratorContext, scope: ModeratorScope, id: string) {
    this.assertScope(context, scope);
    switch (scope) {
      case 'BIOLINK': {
        const item = await this.prisma.biolink.findUnique({
          where: { id },
          include: { city: true, business: true, user: { select: { fullName: true, email: true } } },
        });
        if (!item) throw new NotFoundException('بیولینک یافت نشد');
        return item;
      }
      case 'BUSINESS_CARD': {
        const item = await this.prisma.businessCard.findUnique({
          where: { id },
          include: { city: true, business: true, user: { select: { fullName: true, email: true } } },
        });
        if (!item) throw new NotFoundException('کارت ویزیت یافت نشد');
        return item;
      }
      case 'FEED': {
        const item = await this.prisma.feedPost.findUnique({
          where: { id },
          include: { topic: true, user: { select: { fullName: true, email: true } } },
        });
        if (!item) throw new NotFoundException('پست فید یافت نشد');
        return item;
      }
      case 'NEWS':
        return this.news.adminById(id);
      default:
        throw new NotFoundException('محتوا یافت نشد');
    }
  }

  // ---- edits ----

  async update(
    context: ModeratorContext,
    scope: ModeratorScope,
    id: string,
    body: ModeratorContentUpdateDto,
  ) {
    this.assertScope(context, scope);
    switch (scope) {
      case 'BIOLINK':
        return this.admin.updateBiolink(id, pickProfileFields(body) as UpdateBiolinkDto);
      case 'BUSINESS_CARD':
        return this.admin.updateBusinessCard(
          id,
          pickProfileFields(body) as UpdateBusinessCardDto,
        );
      case 'FEED':
        return this.feeds.updatePostContent(id, {
          body: body.body,
          topicId: body.topicId,
        });
      case 'NEWS': {
        if (!body.title?.trim()) {
          throw new BadRequestException('عنوان خبر الزامی است');
        }
        return this.news.adminUpdate(context.id, id, {
          title: body.title,
          summary: body.summary,
          body: body.body,
          categoryId: body.categoryId,
          status: body.status,
        } as UpdateNewsAdminDto);
      }
      default:
        throw new NotFoundException('محتوا یافت نشد');
    }
  }

  // ---- approve / reject ----

  async decide(
    context: ModeratorContext,
    scope: ModeratorScope,
    id: string,
    decision: ModerationDecision,
    reason?: string,
  ) {
    this.assertScope(context, scope);
    const actorId = context.id;
    const approved = decision === ModerationDecision.APPROVED;
    switch (scope) {
      case 'BIOLINK': {
        const result = await this.admin.moderate(actorId, id, {
          decision,
          reason,
        } as ModerateBiolinkDto);
        await this.decisions.record({
          kind: ContentDecisionKind.BIOLINK,
          itemId: id,
          adminId: actorId,
          approved,
          reason,
        });
        return result;
      }
      case 'BUSINESS_CARD': {
        const result = await this.admin.moderateBusinessCard(actorId, id, {
          decision,
          reason,
        } as ModerateBiolinkDto);
        await this.decisions.record({
          kind: ContentDecisionKind.BUSINESS_CARD,
          itemId: id,
          adminId: actorId,
          approved,
          reason,
        });
        return result;
      }
      case 'FEED': {
        const result = await this.feeds.moderatePost(
          actorId,
          id,
          approved ? NewsStatus.APPROVED : NewsStatus.REJECTED,
          reason,
        );
        await this.decisions.record({
          kind: ContentDecisionKind.FEED,
          itemId: id,
          adminId: actorId,
          approved,
          reason,
        });
        return result;
      }
      case 'NEWS': {
        const result = await this.news.moderate(
          actorId,
          id,
          approved ? NewsStatus.APPROVED : NewsStatus.REJECTED,
          reason,
        );
        await this.decisions.record({
          kind: ContentDecisionKind.NEWS,
          itemId: id,
          adminId: actorId,
          approved,
          reason,
        });
        return result;
      }
      case 'SUBSCRIPTION_REQUESTS':
        return this.subscriptions.decideRequest(actorId, id, {
          status: approved ? SubscriptionStatus.ACTIVE : SubscriptionStatus.REJECTED,
          adminNote: reason,
        } as never);
      case 'AD_REQUESTS':
      case 'DIRECTORY_AD_REQUESTS':
        return this.ads.decide(actorId, id, {
          status: approved ? BoostStatus.APPROVED : BoostStatus.REJECTED,
          adminNote: reason,
        } as never);
      case 'BOOST_REQUESTS':
        return this.boosts.decide(actorId, id, {
          status: approved ? BoostStatus.APPROVED : BoostStatus.REJECTED,
          adminNote: reason,
        } as never);
      default:
        throw new NotFoundException('محتوا یافت نشد');
    }
  }
}

function paginate<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): QueuePage {
  return {
    items,
    total,
    page,
    limit,
    hasNext: page * limit < total,
  };
}

function toSubscriptionStatus(status: NewsStatus): SubscriptionStatus {
  if (status === NewsStatus.APPROVED) return SubscriptionStatus.ACTIVE;
  if (status === NewsStatus.REJECTED) return SubscriptionStatus.REJECTED;
  return SubscriptionStatus.PENDING;
}

function toBoostStatus(status: NewsStatus): BoostStatus {
  if (status === NewsStatus.APPROVED) return BoostStatus.APPROVED;
  if (status === NewsStatus.REJECTED) return BoostStatus.REJECTED;
  return BoostStatus.PENDING;
}

/** Profile-style editable fields, shared by biolink and business-card edits. */
const PROFILE_FIELDS = [
  'fullName',
  'jobTitle',
  'company',
  'bio',
  'phone',
  'email',
  'website',
  'address',
  'avatarUrl',
  'logoUrl',
  'linkedin',
  'instagram',
  'telegram',
  'twitter',
  'whatsapp',
  'primaryColor',
  'template',
  'cityId',
  'businessId',
] as const;

function pickProfileFields(
  body: ModeratorContentUpdateDto,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of PROFILE_FIELDS) {
    const value = body[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}
