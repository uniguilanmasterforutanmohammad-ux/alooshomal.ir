import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NewsStatus,
  NotificationType,
  Prisma,
  Role,
} from '@prisma/client';

import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { ListNewsDto } from './dto/list-news.dto';

const newsInclude = {
  author: { select: { id: true, email: true, fullName: true, role: true } },
  category: { select: { id: true, name: true } },
};

@Injectable()
export class NewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly settings: SettingsService,
    private readonly activity: ActivityService,
  ) {}

  // ------------------------------------------------------------------
  //  Public feed — approvals only
  // ------------------------------------------------------------------

  /** Home-page headlines: the newest N approved items (N is admin-configurable). */
  async publicHeadlines(limit?: number) {
    const take = limit ?? (await this.settings.getNewsHeadlineCount());
    return this.prisma.newsItem.findMany({
      where: { status: NewsStatus.APPROVED },
      orderBy: { publishedAt: 'desc' },
      take: Math.min(Math.max(take, 1), 50),
      select: {
        id: true,
        title: true,
        summary: true,
        publisherName: true,
        publishedAt: true,
        createdAt: true,
        category: { select: { id: true, name: true } },
      },
    });
  }

  /** Public «نبض شهر» list with search + category filter and pagination. */
  async publicList(query: ListNewsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const where: Prisma.NewsItemWhereInput = {
      status: NewsStatus.APPROVED,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { summary: { contains: query.q, mode: 'insensitive' } },
              { body: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.newsItem.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: newsInclude,
      }),
      this.prisma.newsItem.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async publicById(id: string) {
    const item = await this.prisma.newsItem.findFirst({
      where: { id, status: NewsStatus.APPROVED },
      include: newsInclude,
    });
    if (!item) {
      throw new NotFoundException('خبر یافت نشد');
    }
    return item;
  }

  /** Active news categories for public filter dropdowns. */
  listCategories(onlyActive = true) {
    return this.prisma.newsCategory.findMany({
      where: onlyActive ? { isActive: true } : {},
      orderBy: { name: 'asc' },
    });
  }

  // ------------------------------------------------------------------
  //  Reporter access requests
  // ------------------------------------------------------------------

  async requestReporter(userId: string, message?: string) {
    const existing = await this.prisma.reporterRequest.findFirst({
      where: { userId, status: NewsStatus.PENDING },
    });
    if (existing) {
      return existing;
    }
    const created = await this.prisma.reporterRequest.create({
      data: { userId, message: message ?? null },
    });
    return created;
  }

  async reporterStatus(userId: string) {
    const last = await this.prisma.reporterRequest.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return last ?? null;
  }

  // ------------------------------------------------------------------
  //  Reporter panel (own news)
  // ------------------------------------------------------------------

  /**
   * Enforce the admin-configured access level for filing news:
   *   - ADMINS_ONLY     → only admins
   *   - REPORTERS_ONLY  → admins + approved citizen-reporters
   *   - ANY_ACTIVE_USER → any active logged-in user
   */
  private async assertCanPublish(userId: string) {
    const level = await this.settings.getNewsAccessLevel();
    if (level === 'ANY_ACTIVE_USER') return;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) {
      throw new ForbiddenException('کاربر یافت نشد');
    }
    if (user.role === Role.ADMIN) return;
    if (level === 'REPORTERS_ONLY' && user.role === Role.CITIZEN_REPORTER) return;
    throw new ForbiddenException(
      'برای ثبت خبر ابتدا باید نقش شهروند خبرنگار شما تأیید شود.',
    );
  }

  async createMine(userId: string, dto: CreateNewsDto) {
    await this.assertCanPublish(userId);
    const item = await this.prisma.newsItem.create({
      data: {
        title: dto.title,
        summary: dto.summary ?? null,
        body: dto.body ?? null,
        publisherName: dto.publisherName ?? null,
        categoryId: dto.categoryId ?? null,
        authorId: userId,
        status: NewsStatus.PENDING,
      },
      include: newsInclude,
    });
    await this.notifications.notifyAdmins({
      title: 'خبر جدید در انتظار تأیید',
      body: `خبر «${item.title}» ثبت شد و در انتظار بررسی است.`,
      link: '/admin?section=news',
      type: NotificationType.INFO,
      actorId: userId,
    });
    await this.activity.log({
      actor: { id: userId },
      action: 'NEWS_CREATED',
      summary: `ثبت خبر «${item.title}»`,
      entityType: 'NEWS',
      entityId: item.id,
    });
    return item;
  }

  async listMine(userId: string, query: ListNewsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.NewsItemWhereInput = {
      authorId: userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.q ? { title: { contains: query.q, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.newsItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: newsInclude,
      }),
      this.prisma.newsItem.count({ where }),
    ]);
    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async updateMine(userId: string, id: string, dto: CreateNewsDto) {
    const item = await this.prisma.newsItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('خبر یافت نشد');
    }
    if (item.authorId !== userId) {
      throw new ForbiddenException('این خبر متعلق به شما نیست');
    }
    // Any edit sends the item back for another review.
    const updated = await this.prisma.newsItem.update({
      where: { id },
      data: {
        title: dto.title,
        summary: dto.summary ?? null,
        body: dto.body ?? null,
        publisherName: dto.publisherName ?? null,
        categoryId: dto.categoryId ?? null,
        status: NewsStatus.PENDING,
        reason: null,
      },
      include: newsInclude,
    });
    await this.activity.log({
      actor: { id: userId },
      action: 'NEWS_UPDATED',
      summary: `ویرایش خبر «${updated.title}»`,
      entityType: 'NEWS',
      entityId: id,
    });
    return updated;
  }

  async summaryForReporter(userId: string) {
    const [total, pending, approved, rejected] = await this.prisma.$transaction([
      this.prisma.newsItem.count({ where: { authorId: userId } }),
      this.prisma.newsItem.count({ where: { authorId: userId, status: NewsStatus.PENDING } }),
      this.prisma.newsItem.count({ where: { authorId: userId, status: NewsStatus.APPROVED } }),
      this.prisma.newsItem.count({ where: { authorId: userId, status: NewsStatus.REJECTED } }),
    ]);
    return { total, pending, approved, rejected };
  }

  // ------------------------------------------------------------------
  //  Admin
  // ------------------------------------------------------------------

  async adminList(query: ListNewsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? (await this.settings.getAdminListPageSize());
    const where: Prisma.NewsItemWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { body: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.newsItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: newsInclude,
      }),
      this.prisma.newsItem.count({ where }),
    ]);
    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async moderate(adminId: string, id: string, decision: NewsStatus, reason?: string) {
    const item = await this.prisma.newsItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('خبر یافت نشد');
    }
    const approved = decision === NewsStatus.APPROVED;
    const now = new Date();
    const updated = await this.prisma.newsItem.update({
      where: { id },
      data: {
        status: decision,
        reason: approved ? null : reason ?? null,
        isPublished: approved,
        publishedAt: approved ? item.publishedAt ?? now : null,
      },
      include: newsInclude,
    });

    if (item.authorId) {
      await this.notifications.notify({
        userId: item.authorId,
        title: approved ? 'خبر شما تأیید شد' : 'خبر شما رد شد',
        body: approved
          ? `خبر «${updated.title}» منتشر شد.`
          : reason
            ? `خبر «${updated.title}» رد شد: ${reason}`
            : `خبر «${updated.title}» رد شد.`,
        type: approved ? NotificationType.SUCCESS : NotificationType.WARNING,
        link: '/dashboard/reporter',
        actorId: adminId,
      });
    }

    await this.activity.log({
      actor: { id: adminId },
      action: approved ? 'NEWS_APPROVED' : 'NEWS_REJECTED',
      summary: `${approved ? 'تأیید' : 'رد'} خبر «${updated.title}»`,
      entityType: 'NEWS',
      entityId: id,
    });
    return updated;
  }

  async remove(id: string) {
    const item = await this.prisma.newsItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('خبر یافت نشد');
    }
    await this.prisma.newsItem.delete({ where: { id } });
    return { deleted: true };
  }

  // ---- reporter requests (admin) ----

  async listReporterRequests(status?: NewsStatus) {
    return this.prisma.reporterRequest.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, fullName: true, role: true } },
      },
    });
  }

  async decideReporterRequest(
    adminId: string,
    requestId: string,
    decision: NewsStatus,
    reason?: string,
  ) {
    const request = await this.prisma.reporterRequest.findUnique({
      where: { id: requestId },
      include: { user: { select: { id: true, email: true, fullName: true } } },
    });
    if (!request) {
      throw new NotFoundException('درخواست یافت نشد');
    }
    const approved = decision === NewsStatus.APPROVED;

    await this.prisma.$transaction([
      this.prisma.reporterRequest.update({
        where: { id: requestId },
        data: { status: decision, reason: reason ?? null, decidedAt: new Date() },
      }),
      ...(approved
        ? [
            this.prisma.user.update({
              where: { id: request.userId },
              data: { role: 'CITIZEN_REPORTER' },
            }),
          ]
        : []),
    ]);

    await this.notifications.notify({
      userId: request.userId,
      title: approved ? 'نقش شهروند خبرنگار فعال شد' : 'درخواست شهروند خبرنگار رد شد',
      body: approved
        ? 'از این پس می‌توانید خبر ثبت کنید.'
        : reason
          ? `درخواست شما رد شد: ${reason}`
          : 'درخواست شما رد شد.',
      type: approved ? NotificationType.SUCCESS : NotificationType.WARNING,
      link: '/dashboard/reporter',
      actorId: adminId,
    });
    await this.activity.log({
      actor: { id: adminId },
      action: approved ? 'REPORTER_APPROVED' : 'REPORTER_REJECTED',
      summary: `${approved ? 'تأیید' : 'رد'} شهروند خبرنگار «${request.user.fullName ?? request.user.email}»`,
      entityType: 'USER',
      entityId: request.userId,
    });
    return { ok: true };
  }

  // ---- categories (admin) ----

  async createCategory(name: string) {
    return this.prisma.newsCategory.create({ data: { name } });
  }

  async updateCategory(id: string, data: { name?: string; isActive?: boolean }) {
    return this.prisma.newsCategory.update({ where: { id }, data });
  }

  async removeCategory(id: string) {
    await this.prisma.newsCategory.delete({ where: { id } });
    return { deleted: true };
  }
}
