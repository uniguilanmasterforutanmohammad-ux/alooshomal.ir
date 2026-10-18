import { Injectable } from '@nestjs/common';
import { NotificationScope, NotificationType, Prisma } from '@prisma/client';

import { SCOPE_TO_NOTIFICATION } from '../auth/moderator-scope-map';
import { MODERATOR_SCOPES } from '../auth/moderator-scopes';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdminNotifyCategory,
  SettingsService,
} from '../settings/settings.service';
import { NotificationsEventsService } from './notifications-events.service';

export interface NotifyPayload {
  /** specific user; omit to notify the admin team */
  userId?: string | null;
  audience?: 'USER' | 'ADMIN';
  type?: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
  /** the user who triggered the event (for the trail) */
  actorId?: string | null;
  /**
   * Reviewer scope this admin notification is addressed to. Defaults to `ALL`
   * (every admin). Used to keep a limited «کاربر ادمین» bell limited to the
   * queues they may act on.
   */
  scope?: NotificationScope;
  /**
   * Admin-feed category. When set and the admin has muted that category, the
   * notification is dropped before it is written (no row, no client poll hit).
   */
  category?: AdminNotifyCategory;
}

/**
 * Central fan-out for in-app notifications. Other modules call `notify()` /
 * `notifyAdmins()` so every meaningful action shows up under the bell icon.
 * Notification creation is best-effort: a failure here must never break the
 * business action itself.
 */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly events: NotificationsEventsService,
  ) {}

  async notify(payload: NotifyPayload) {
    try {
      const audience = payload.audience ?? (payload.userId ? 'USER' : 'ADMIN');
      if (audience === 'ADMIN' && payload.category) {
        const enabled = await this.settings.isAdminNotifyEnabled(payload.category);
        if (!enabled) return null;
      }
      const created = await this.prisma.notification.create({
        data: {
          userId: payload.userId ?? null,
          audience,
          scope: payload.scope ?? NotificationScope.ALL,
          type: payload.type ?? NotificationType.INFO,
          title: payload.title,
          body: payload.body ?? null,
          link: payload.link ?? null,
          actorId: payload.actorId ?? null,
        },
      });
      // Push a live signal to connected clients (badge updates instantly).
      this.events.emit({
        audience: audience === 'ADMIN' ? 'ADMIN' : 'USER',
        userId: created.userId,
      });
      return created;
    } catch {
      return null;
    }
  }

  /** Notify the whole admin team (userId is null, audience = ADMIN). */
  notifyAdmins(payload: Omit<NotifyPayload, 'userId' | 'audience'>) {
    return this.notify({ ...payload, userId: null, audience: 'ADMIN' });
  }

  /**
   * Unread notifications for the bell popover. Read ones are hidden so the
   * list stays a to-do queue; the full history lives on the notifications page.
   */
  async listForUser(userId: string, limit = 30) {
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId, readAt: null },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { items, unread, total: unread };
  }

  /** Full history for the notifications page — read and unread, newest first. */
  async pageForUser(userId: string, page = 1, limit = 20) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const where = { userId };
    const [items, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    return {
      items,
      unread,
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
   * Unread notifications for the admin bell popover (read ones are hidden; the
   * full admin history is available through `pageForAdmin`).
   */
  async listForAdmin(limit = 50) {
    const where = { audience: 'ADMIN' };
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { ...where, readAt: null },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.notification.count({ where: { ...where, readAt: null } }),
    ]);
    return { items, unread, total: unread };
  }

  /** Full admin history — read and unread, newest first. */
  async pageForAdmin(page = 1, limit = 20) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const where = { audience: 'ADMIN' as const };
    const [items, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...where, readAt: null } }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    return {
      items,
      unread,
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

  async unreadCountForUser(userId: string) {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(
    id: string,
    scope: { userId?: string; admin?: boolean; scopeFilter?: Prisma.NotificationWhereInput },
  ) {
    const where = scope.admin
      ? { id, audience: 'ADMIN', ...(scope.scopeFilter ?? {}) }
      : { id, userId: scope.userId };
    await this.prisma.notification.updateMany({
      where: { ...where, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async markAllRead(scope: {
    userId?: string;
    admin?: boolean;
    scopeFilter?: Prisma.NotificationWhereInput;
  }) {
    const where = scope.admin
      ? { audience: 'ADMIN' as const, readAt: null, ...(scope.scopeFilter ?? {}) }
      : { userId: scope.userId, readAt: null };
    await this.prisma.notification.updateMany({
      where,
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  /** Where-clause for a reviewer's own admin feed (exposed for mark-read). */
  async scopeFilterFor(userId: string) {
    return this.adminScopeFilter(userId);
  }

  // ------------------------------------------------------------------
  //  Limited «کاربر ادمین» feeds (scope-filtered)
  // ------------------------------------------------------------------

  /**
   * Notification scopes a reviewer may see. A super admin sees everything; a
   * moderator only the review queues they have been granted. Unscoped (`ALL`)
   * broadcasts — new sign-ups, tickets, security changes — are deliberately
   * excluded: a limited «کاربر ادمین» only has the content-review panel and
   * must not be pinged about unrelated admin work.
   */
  private async adminScopeFilter(userId: string): Promise<Prisma.NotificationWhereInput> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, moderatorScopes: true },
    });
    if (!user || user.role === 'ADMIN') return {};
    const allowed = MODERATOR_SCOPES.filter((scope) =>
      user.moderatorScopes.includes(scope),
    ).map((scope) => SCOPE_TO_NOTIFICATION[scope]);
    return { scope: { in: allowed } };
  }

  /** Unread, scope-filtered admin notifications for one reviewer's bell. */
  async listForReviewer(userId: string, limit = 50) {
    const scopeFilter = await this.adminScopeFilter(userId);
    const where: Prisma.NotificationWhereInput = {
      audience: 'ADMIN',
      ...scopeFilter,
    };
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { ...where, readAt: null },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.notification.count({ where: { ...where, readAt: null } }),
    ]);
    return { items, unread, total: unread };
  }

  /** Full, scope-filtered admin history for one reviewer. */
  async pageForReviewer(userId: string, page = 1, limit = 20) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const scopeFilter = await this.adminScopeFilter(userId);
    const where: Prisma.NotificationWhereInput = {
      audience: 'ADMIN',
      ...scopeFilter,
    };
    const [items, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...where, readAt: null } }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    return {
      items,
      unread,
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

  async unreadCountForReviewer(userId: string) {
    const scopeFilter = await this.adminScopeFilter(userId);
    return this.prisma.notification.count({
      where: { audience: 'ADMIN', ...scopeFilter, readAt: null },
    });
  }
}
