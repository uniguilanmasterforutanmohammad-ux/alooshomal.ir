import { Injectable } from '@nestjs/common';

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

  /** Return the cached value for `key`, or compute and cache it via `factory`. */
  async get<T>(key: string, factory: () => Promise<T>): Promise<T> {
    if (this.ttlMs === 0) {
      return factory();
    }
    const cached = this.store.get(key);
    if (cached && Date.now() - cached.at < this.ttlMs) {
      return cached.value as T;
    }
    // Collapse concurrent misses into a single upstream query.
    const pending = this.inflight.get(key);
    if (pending) {
      return pending as Promise<T>;
    }
    const promise = factory()
      .then((value) => {
        this.store.set(key, { at: Date.now(), value });
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
      return;
    }
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }
}
