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

  /** Notifications visible to the current user (their own + admin broadcast). */
  async listForUser(userId: string, limit = 30) {
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { items, unread, total: unread };
  }

  /** Notifications visible to admins (the shared ADMIN feed). */
  async listForAdmin(limit = 50) {
    const where = { audience: 'ADMIN' };
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.notification.count({ where: { ...where, readAt: null } }),
    ]);
    return { items, unread, total: unread };
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
