import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Server-side session registry backing every login.
 *
 * Access tokens stay stateless JWTs (fast to verify), but they carry a session
 * id (`sid`). The JWT strategy checks that the session still exists and is
 * unexpired on each request, which makes tokens *revocable*: logging out on one
 * device, an admin force-logout, or an idle timeout all take effect immediately
 * even though the JWT signature is still valid.
 */

/** Default absolute lifetime of a session (hard cap, regardless of activity). */
export const SESSION_ABSOLUTE_DAYS = 30;

/**
 * Idle timeout: how long a session may go unused before it is treated as
 * expired. 7 days matches the requested «۷ روز بدون فعالیت» rule and is the
 * common upper bound for consumer apps (OWASP recommends re-authentication on
 * inactivity; 7–14 days is typical for "remember me" style flows).
 */
export const SESSION_IDLE_DAYS = 7;

/** Refresh tokens live as long as the idle window; each refresh extends it. */
export const REFRESH_IDLE_DAYS = SESSION_IDLE_DAYS;

export const sha256 = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

export interface CreateSessionInput {
  userId: string;
  userAgent?: string | null;
  ip?: string | null;
}

export interface CreatedSession {
  id: string;
  /** Raw refresh token — returned once, only its hash is stored. */
  refreshToken: string;
  expiresAt: Date;
}

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  private idleFromNow(): Date {
    return new Date(Date.now() + SESSION_IDLE_DAYS * 24 * 60 * 60 * 1000);
  }

  private absoluteFromNow(): Date {
    return new Date(Date.now() + SESSION_ABSOLUTE_DAYS * 24 * 60 * 60 * 1000);
  }

  /** Creates a new session and mints its refresh token. */
  async create(input: CreateSessionInput): Promise<CreatedSession> {
    const refreshToken = randomBytes(48).toString('base64url');
    const expiresAt = this.absoluteFromNow();
    const session = await this.prisma.session.create({
      data: {
        userId: input.userId,
        refreshHash: sha256(refreshToken),
        userAgent: input.userAgent?.slice(0, 300) ?? null,
        ip: input.ip?.slice(0, 64) ?? null,
        expiresAt,
      },
      select: { id: true },
    });
    return { id: session.id, refreshToken, expiresAt };
  }

  /**
   * Returns the live session for an access token, or null when it was revoked,
   * idle-expired or hard-expired. Used by the JWT strategy on every request.
   */
  async findActive(sessionId: string, userId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        userId: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
      },
    });
    if (!session || session.userId !== userId) return null;
    if (session.revokedAt) return null;
    const now = Date.now();
    if (session.expiresAt.getTime() <= now) return null;
    if (now - session.lastUsedAt.getTime() > SESSION_IDLE_DAYS * 86400_000) {
      return null;
    }
    return session;
  }

  /** Best-effort activity stamp; failures must never block a request. */
  async touch(sessionId: string): Promise<void> {
    await this.prisma.session
      .update({ where: { id: sessionId }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);
  }

  /**
   * Rotates a refresh token: the old token is invalidated and a fresh one is
   * issued. Detecting a *reuse* of an already-rotated token is the classic
   * signal of theft, but a single-session row cannot tell "rotated" from
   * "unknown", so a miss is simply treated as an invalid token.
   */
  async rotateRefresh(rawToken: string) {
    const hash = sha256(rawToken);
    const session = await this.prisma.session.findUnique({
      where: { refreshHash: hash },
      select: {
        id: true,
        userId: true,
        revokedAt: true,
        expiresAt: true,
        lastUsedAt: true,
      },
    });
    if (!session || session.revokedAt) return null;
    const now = Date.now();
    if (session.expiresAt.getTime() <= now) return null;
    if (now - session.lastUsedAt.getTime() > REFRESH_IDLE_DAYS * 86400_000) {
      return null;
    }
    const refreshToken = randomBytes(48).toString('base64url');
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshHash: sha256(refreshToken),
        lastUsedAt: new Date(),
      },
    });
    return { sessionId: session.id, userId: session.userId, refreshToken };
  }

  /** Revokes one session (logout of the current device). */
  async revoke(sessionId: string, userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Revokes one of the current user's own sessions by id. */
  async revokeOwn(userId: string, sessionId: string): Promise<boolean> {
    const result = await this.prisma.session.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count > 0;
  }

  /** Revokes every session of a user (logout everywhere, admin force-logout). */
  async revokeAll(userId: string, exceptSessionId?: string): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  /**
   * Marks stale rows as revoked so the session list never grows forever.
   * Called opportunistically when a user opens their session list.
   */
  async pruneStale(userId: string): Promise<void> {
    const idleCutoff = new Date(Date.now() - SESSION_IDLE_DAYS * 86400_000);
    await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        OR: [{ expiresAt: { lte: new Date() } }, { lastUsedAt: { lte: idleCutoff } }],
      },
      data: { revokedAt: new Date() },
    });
  }

  /** Sessions of one user, newest activity first, paginated. */
  async listForUser(userId: string, page = 1, limitOverride?: number) {
    const limit = limitOverride ?? 10;
    const currentPage = Math.max(1, page);
    const idleCutoff = new Date(Date.now() - SESSION_IDLE_DAYS * 86400_000);
    const [rows, total] = await Promise.all([
      this.prisma.session.findMany({
        where: { userId },
        orderBy: { lastUsedAt: 'desc' },
        skip: (currentPage - 1) * limit,
        take: limit,
        select: {
          id: true,
          userAgent: true,
          ip: true,
          createdAt: true,
          lastUsedAt: true,
          expiresAt: true,
          revokedAt: true,
        },
      }),
      this.prisma.session.count({ where: { userId } }),
    ]);
    const now = Date.now();
    return {
      items: rows.map((row) => ({
        ...row,
        active:
          !row.revokedAt &&
          row.expiresAt.getTime() > now &&
          now - row.lastUsedAt.getTime() <= SESSION_IDLE_DAYS * 86400_000,
        idleExpiresAt: new Date(row.lastUsedAt.getTime() + SESSION_IDLE_DAYS * 86400_000),
      })),
      meta: {
        page: currentPage,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNext: currentPage * limit < total,
        hasPrev: currentPage > 1,
      },
    };
  }

  /** Sessions of an arbitrary user (admin view), with the owner attached. */
  async listForAdmin(userId: string) {
    const { items } = await this.listForUser(userId, 1, 100);
    return items;
  }
}
