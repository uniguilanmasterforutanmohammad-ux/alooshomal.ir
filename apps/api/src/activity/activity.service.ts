import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { currentActivityContext } from './activity-context';

export interface ActivityLogInput {
  /** who performed the action (null for anonymous or system events) */
  actor?: {
    id?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
  /** short machine key, e.g. `TICKET_CREATED` */
  action: string;
  /** one-line Persian description shown in the admin table */
  summary: string;
  entityType?: string | null;
  entityId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * The activity keys that represent a *monetisation* event — a subscription,
 * boost («پله»), paid directory/home ad, feed package or a points reward. The
 * admin "درآمد → لاگ اقدامات درآمدی" panel is scoped to exactly these keys so
 * every purchase attempt and decision is auditable in one place.
 */
export const REVENUE_ACTIONS: readonly string[] = [
  'SUBSCRIPTION_REQUESTED',
  'SUBSCRIPTION_APPROVED',
  'SUBSCRIPTION_REJECTED',
  'SUBSCRIPTION_ASSIGNED',
  'FEED_SUBSCRIPTION_REQUESTED',
  'FEED_SUBSCRIPTION_APPROVED',
  'FEED_SUBSCRIPTION_REJECTED',
  'BOOST_REQUESTED',
  'BOOST_APPROVED',
  'BOOST_REJECTED',
  'AD_REQUESTED',
  'AD_APPROVED',
  'AD_REJECTED',
  'REWARD_REDEEMED',
];

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  /**
   * Record one activity row. Best-effort by design: a logging failure must
   * never break the business action that triggered it.
   */
  async log(input: ActivityLogInput): Promise<void> {
    try {
      // Actor / request metadata come from the ambient request context unless
      // the caller passes them explicitly.
      const ctx = currentActivityContext();
      const actor = input.actor ?? ctx?.actor ?? null;
      const isAdmin = actor?.role === 'ADMIN';
      await this.prisma.activityLog.create({
        data: {
          actorId: actor?.id ?? null,
          actorEmail: actor?.email ?? null,
          actorRole: actor?.role ?? null,
          actorIsAdmin: isAdmin,
          action: input.action,
          summary: input.summary,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          ip: input.ip ?? ctx?.ip ?? null,
          userAgent: input.userAgent ?? ctx?.userAgent ?? null,
        },
      });
    } catch (error) {
      this.logger.warn(`activity log failed: ${String(error)}`);
    }
  }

  /** Paginated feed for the admin "گزارش‌های سیستم" table. */
  async list(params: {
    page?: number;
    limit?: number;
    action?: string;
    actions?: readonly string[];
    adminOnly?: boolean;
    search?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 25));

    const where: Prisma.ActivityLogWhereInput = {};
    if (params.action) where.action = params.action;
    else if (params.actions?.length) where.action = { in: [...params.actions] };
    if (params.adminOnly) where.actorIsAdmin = true;
    if (params.search) {
      where.OR = [
        { summary: { contains: params.search, mode: 'insensitive' } },
        { actorEmail: { contains: params.search, mode: 'insensitive' } },
        { action: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.activityLog.count({ where }),
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

  /** Distinct action keys present in the table (for the filter dropdown). */
  async actions(): Promise<string[]> {
    const rows = await this.prisma.activityLog.findMany({
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' },
    });
    return rows.map((row) => row.action);
  }

  /**
   * Delete rows older than the retention window. Called on a timer (see
   * `ActivityRetentionJob`) and also right after the admin changes the value,
   * so the table shrinks immediately when a shorter window is chosen.
   */
  async prune(): Promise<number> {
    try {
      const months = await this.settings.getActivityRetentionMonths();
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - months);
      const result = await this.prisma.activityLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      if (result.count > 0) {
        this.logger.log(
          `pruned ${result.count} activity rows older than ${months} months`,
        );
      }
      return result.count;
    } catch (error) {
      this.logger.warn(`activity prune failed: ${String(error)}`);
      return 0;
    }
  }
}
