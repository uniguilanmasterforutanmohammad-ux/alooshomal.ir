import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';

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

  async markRead(id: string, scope: { userId?: string; admin?: boolean }) {
    const where = scope.admin
      ? { id, audience: 'ADMIN' }
      : { id, userId: scope.userId };
    await this.prisma.notification.updateMany({
      where: { ...where, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async markAllRead(scope: { userId?: string; admin?: boolean }) {
    const where = scope.admin
      ? { audience: 'ADMIN' as const, readAt: null }
      : { userId: scope.userId, readAt: null };
    await this.prisma.notification.updateMany({
      where,
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
}
