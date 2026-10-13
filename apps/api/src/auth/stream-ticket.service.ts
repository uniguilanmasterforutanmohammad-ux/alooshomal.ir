import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

import { RedisService } from '../redis/redis.service';

/**
 * Single-use, short-lived tickets for EventSource (SSE) connections.
 *
 * `EventSource` cannot attach an `Authorization` header, so the old approach
 * passed the access token in the query string — where it ends up in web-server
 * and proxy logs. Instead, an authenticated request mints a random ticket that
 * is valid for a few seconds *and only once*; the stream URL carries that
 * ticket. Leaking a ticket is therefore far less useful than leaking a token:
 * it is already consumed, or expires almost immediately.
 */

/** How long a ticket stays usable (also the exchange window). */
export const STREAM_TICKET_TTL_SECONDS = 30;

interface TicketPayload {
  userId: string;
  admin: boolean;
}

@Injectable()
export class StreamTicketService {
  /** Fallback store used only while Redis is unavailable. */
  private readonly memory = new Map<string, { payload: TicketPayload; expiresAt: number }>();
  private static readonly MEMORY_MAX = 2000;

  constructor(private readonly redis: RedisService) {}

  private key(ticket: string): string {
    return `sse:ticket:${ticket}`;
  }

  /** Mints a ticket scoped to a user (and whether it is the admin feed). */
  async issue(userId: string, admin: boolean): Promise<{ ticket: string; expiresIn: number }> {
    const ticket = randomBytes(32).toString('base64url');
    const payload: TicketPayload = { userId, admin };
    await this.redis.set(this.key(ticket), JSON.stringify(payload), STREAM_TICKET_TTL_SECONDS);
    if (!this.redis.isReady) {
      this.pruneMemory();
      this.memory.set(ticket, {
        payload,
        expiresAt: Date.now() + STREAM_TICKET_TTL_SECONDS * 1000,
      });
    }
    return { ticket, expiresIn: STREAM_TICKET_TTL_SECONDS };
  }

  /** Consumes a ticket (single use); returns null when unknown or expired. */
  async consume(ticket: string): Promise<TicketPayload | null> {
    if (this.redis.isReady) {
      const raw = await this.redis.getdel(this.key(ticket));
      if (!raw) return null;
      try {
        return JSON.parse(raw) as TicketPayload;
      } catch {
        return null;
      }
    }
    const entry = this.memory.get(ticket);
    if (!entry) return null;
    this.memory.delete(ticket);
    if (entry.expiresAt < Date.now()) return null;
    return entry.payload;
  }

  private pruneMemory(): void {
    const now = Date.now();
    for (const [key, entry] of this.memory) {
      if (entry.expiresAt <= now) this.memory.delete(key);
    }
    while (this.memory.size > StreamTicketService.MEMORY_MAX) {
      const oldest = this.memory.keys().next().value;
      if (oldest === undefined) break;
      this.memory.delete(oldest);
    }
  }
}
