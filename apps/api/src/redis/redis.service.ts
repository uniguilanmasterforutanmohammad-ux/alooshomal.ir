import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Thin, resilient wrapper around an optional Redis connection.
 *
 * Redis is a *cache*, never the source of truth: if it is missing or
 * unreachable the API keeps working (every read falls back to Postgres). The
 * connection is therefore lazy and never throws on startup — it just flips
 * `enabled` to false until the server comes back.
 *
 * Enable it with `REDIS_URL` (e.g. `redis://redis:6379`). When the variable is
 * empty the whole layer is disabled and the app behaves exactly as before.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private ready = false;
  readonly enabled: boolean;

  constructor() {
    const url = process.env.REDIS_URL?.trim();
    this.enabled = Boolean(url);
    if (!this.enabled) {
      return;
    }
    this.client = new Redis(url as string, {
      lazyConnect: false,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 200, 5000),
    });
    this.client.on('ready', () => {
      this.ready = true;
      this.logger.log('Redis connected — shared cache enabled');
    });
    this.client.on('error', (error) => {
      // Log once per state change, not on every retry.
      if (this.ready) {
        this.logger.warn(`Redis error, falling back to memory: ${error.message}`);
      }
      this.ready = false;
    });
    this.client.on('end', () => {
      this.ready = false;
    });
  }

  /** True only while the connection is actually usable. */
  get isReady(): boolean {
    return this.enabled && this.ready;
  }

  async get(key: string): Promise<string | null> {
    if (!this.isReady || !this.client) {
      return null;
    }
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!this.isReady || !this.client) {
      return;
    }
    try {
      await this.client.set(key, value, 'EX', Math.max(1, Math.floor(ttlSeconds)));
    } catch {
      // cache writes are best-effort
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (!this.isReady || !this.client || keys.length === 0) {
      return;
    }
    try {
      await this.client.del(...keys);
    } catch {
      // ignore
    }
  }

  /**
   * Atomically increments a counter and returns its new value, setting the TTL
   * on first use. Returns null when Redis is unavailable or the call fails, so
   * callers can fall back to an in-memory counter.
   */
  async incr(key: string, ttlSeconds: number): Promise<number | null> {
    if (!this.isReady || !this.client) {
      return null;
    }
    try {
      const value = await this.client.incr(key);
      if (value === 1) {
        await this.client.expire(key, Math.max(1, Math.floor(ttlSeconds)));
      }
      return value;
    } catch {
      return null;
    }
  }

  /** Delete every key under `prefix` using a non-blocking SCAN. */
  async delByPrefix(prefix: string): Promise<void> {
    if (!this.isReady || !this.client) {
      return;
    }
    try {
      let cursor = '0';
      do {
        const [next, keys] = await this.client.scan(
          cursor,
          'MATCH',
          `${prefix}*`,
          'COUNT',
          200,
        );
        cursor = next;
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } while (cursor !== '0');
    } catch {
      // ignore
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
    }
  }
}
