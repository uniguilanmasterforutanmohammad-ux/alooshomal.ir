import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BiolinkStatus, ModerationDecision, NewsStatus } from '@prisma/client';

import { AdminService } from '../admin/admin.service';
import { ModerateBiolinkDto } from '../admin/dto/moderate-biolink.dto';
import { UpdateBiolinkDto } from '../biolinks/dto/update-biolink.dto';
import { UpdateBusinessCardDto } from '../businesscards/dto/update-business-card.dto';
import { FeedsService } from '../feeds/feeds.service';
import { UpdateNewsAdminDto } from '../news/dto/update-news-admin.dto';
import { ListNewsDto } from '../news/dto/list-news.dto';
import { NewsService } from '../news/news.service';
import { PrismaService } from '../prisma/prisma.service';
import { MODERATOR_SCOPES, ModeratorScope } from '../auth/moderator-scopes';
import { ModeratorContentUpdateDto } from './dto/moderator-content.dto';

export interface ModeratorContext {
  id: string;
  email: string | null;
  fullName: string | null;
  role: 'MODERATOR' | 'ADMIN';
  scopes: ModeratorScope[];
}

/**
 * Backs the limited «کاربر ادمین» review panel. Every method takes the caller
 * (so it can re-check scopes defensively) plus the requested content scope, and
 * delegates the actual mutation to the same services the full admin panel uses
 * — so moderation rules, notifications, points and activity logging all stay
 * identical between a moderator and a super admin.
 */
@Injectable()
export class ModeratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly admin: AdminService,
    private readonly feeds: FeedsService,
    private readonly news: NewsService,
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
    };
  }

  private assertScope(context: ModeratorContext, scope: ModeratorScope) {
    if (!context.scopes.includes(scope)) {
      throw new ForbiddenException('دسترسی به این بخش برای شما فعال نیست');
    }
  }

  /** Pending counts per queue, scoped to what the caller may review. */
  async overview(context: ModeratorContext) {
    const can = (scope: ModeratorScope) => context.scopes.includes(scope);
    const [biolinks, businessCards, feedPosts, news] = await Promise.all([
      can('BIOLINK')
        ? this.prisma.biolink.count({ where: { status: BiolinkStatus.PENDING } })
        : 0,
      can('BUSINESS_CARD')
        ? this.prisma.businessCard.count({ where: { status: BiolinkStatus.PENDING } })
        : 0,
      can('FEED')
        ? this.prisma.feedPost.count({ where: { status: NewsStatus.PENDING } })
        : 0,
      can('NEWS')
        ? this.prisma.newsItem.count({ where: { status: NewsStatus.PENDING } })
        : 0,
    ]);
    return {
      scopes: context.scopes,
      pending: { BIOLINK: biolinks, BUSINESS_CARD: businessCards, FEED: feedPosts, NEWS: news },
    };
  }

  /** Feed topics, used by the moderator feed editor. */
  listTopics() {
    return this.feeds.listTopics(false);
  }

  /** News categories, used by the moderator news editor. */
  listNewsCategories() {
    return this.news.listCategories(false);
  }

  // ---- queue lists ----

  async list(
    context: ModeratorContext,
    scope: ModeratorScope,
    status?: NewsStatus,
  ) {
    this.assertScope(context, scope);
    switch (scope) {
      case 'BIOLINK':
        return this.listBiolinks(status);
      case 'BUSINESS_CARD':
        return this.listBusinessCards(status);
      case 'FEED':
        return this.feeds.adminListPosts(status);
      case 'NEWS': {
        const query: ListNewsDto = { page: 1, limit: 100, status };
        const result = await this.news.adminList(query);
        return result.items;
      }
      default:
        return [];
    }
  }

  private async listBiolinks(status?: NewsStatus) {
    const items = await this.prisma.biolink.findMany({
      where: status ? { status: status as BiolinkStatus } : {},
      include: { user: { select: { id: true, email: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return items;
  }

  private async listBusinessCards(status?: NewsStatus) {
    const items = await this.prisma.businessCard.findMany({
      where: status ? { status: status as BiolinkStatus } : {},
      include: { user: { select: { id: true, email: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return items;
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
    switch (scope) {
      case 'BIOLINK':
        return this.admin.moderate(actorId, id, {
          decision,
          reason,
        } as ModerateBiolinkDto);
      case 'BUSINESS_CARD':
        return this.admin.moderateBusinessCard(actorId, id, {
          decision,
          reason,
        } as ModerateBiolinkDto);
      case 'FEED':
        return this.feeds.moderatePost(
          actorId,
          id,
          decision === ModerationDecision.APPROVED
            ? NewsStatus.APPROVED
            : NewsStatus.REJECTED,
          reason,
        );
      case 'NEWS':
        return this.news.moderate(
          actorId,
          id,
          decision === ModerationDecision.APPROVED
            ? NewsStatus.APPROVED
            : NewsStatus.REJECTED,
          reason,
        );
      default:
        throw new NotFoundException('محتوا یافت نشد');
    }
  }
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
