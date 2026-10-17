import { Injectable } from '@nestjs/common';

import { RedisService } from '../redis/redis.service';

/**
 * Tiny in-process TTL cache for the public directory facets (active cities /
 * business categories). These are the same on every directory request and only
 * change when an admin edits the taxonomy, so serving them from memory removes
 * two `some(...)` sub-queries from the hot path.
 *
 * The cache is per-process and short-lived (a few seconds); a stale entry can
 * only ever delay a newly added city by that TTL, never corrupt data.
 */
@Injectable()
export class FacetsCacheService {
  private readonly ttlMs: number = (() => {
    const parsed = Number(process.env.FACETS_CACHE_TTL_MS ?? 30_000);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 30_000;
  })();
  private readonly store = new Map<string, { at: number; value: unknown }>();
  private readonly inflight = new Map<string, Promise<unknown>>();

  constructor(private readonly redis: RedisService) {}

  /** Return the cached value for `key`, or compute and cache it via `factory`. */
  async get<T>(key: string, factory: () => Promise<T>, ttlOverrideMs?: number): Promise<T> {
    const ttl = ttlOverrideMs ?? this.ttlMs;
    if (ttl === 0) {
      return factory();
    }
    // 1) in-process cache (fastest, no network)
    const cached = this.store.get(key);
    if (cached && Date.now() - cached.at < ttl) {
      return cached.value as T;
    }
    // 2) shared Redis cache (survives restarts, shared across replicas)
    const fromRedis = await this.redis.get(this.redisKey(key));
    if (fromRedis) {
      try {
        const value = JSON.parse(fromRedis) as T;
        this.store.set(key, { at: Date.now(), value });
        return value;
      } catch {
        // fall through to the factory on corrupt payloads
      }
    }
    // 3) collapse concurrent misses into a single upstream query
    const pending = this.inflight.get(key);
    if (pending) {
      return pending as Promise<T>;
    }
    const promise = factory()
      .then((value) => {
        this.store.set(key, { at: Date.now(), value });
        void this.redis.set(
          this.redisKey(key),
          JSON.stringify(value),
          Math.ceil(ttl / 1000),
        );
        return value;
      })
      .finally(() => {
        this.inflight.delete(key);
      });
    this.inflight.set(key, promise);
    return promise;
  }

  /** Drop cached facets so the next request recomputes them. */
  invalidate(prefix?: string): void {
    if (!prefix) {
      this.store.clear();
      void this.redis.delByPrefix(this.redisPrefix());
      return;
    }
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
    void this.redis.delByPrefix(this.redisKey(prefix));
  }

  private redisPrefix(): string {
    return 'alooshomal:cache:';
  }

  private redisKey(key: string): string {
    return `${this.redisPrefix()}${key}`;
  }

  /**
   * Invalidate everything affected by a change to published directory content:
   * the cached result pages and the facet lists. Called after every write that
   * can add, remove or reorder a public entry.
   */
  invalidateDirectory(kind: 'biolink' | 'businesscard' | 'feed'): void {
    if (kind === 'feed') {
      this.invalidate('dir:feeds');
      return;
    }
    const dir = kind === 'biolink' ? 'dir:biolinks' : 'dir:businesscards';
    const facets = kind === 'biolink' ? 'biolinks:facets' : 'businesscards:facets';
    this.invalidate(dir);
    this.invalidate(facets);
  }
}
