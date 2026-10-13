import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

import { RedisService } from '../redis/redis.service';

interface Window {
  count: number;
  expiresAt: number;
}

export interface RateLimitRule {
  /** Bucket name (one bucket per rule/key tuple). */
  bucket: string;
  limit: number;
  windowSeconds: number;
}

/**
 * Small fixed-window rate limiter for the credential endpoints (login, OTP
 * request/verify). It exists to blunt brute-force and SMS-cost abuse — without
 * it, an attacker can try unlimited passwords or trigger unlimited OTP SMS.
 *
 * Counters live in Redis (shared across API replicas) with an in-memory
 * fallback for single-instance/dev runs. Both use the same fixed window: the
 * counter resets `windowSeconds` after its first hit.
 */
@Injectable()
export class RateLimitService {
  private readonly memory = new Map<string, Window>();
  private static readonly MEMORY_MAX = 10_000;

  constructor(private readonly redis: RedisService) {}

  /**
   * Records one hit against `key` for the rule and throws 429 when the limit is
   * exceeded. Call it *before* doing the expensive/security-sensitive work.
   */
  async hit(rule: RateLimitRule, key: string): Promise<void> {
    const fullKey = `ratelimit:${rule.bucket}:${key}`;
    const count = await this.redis.incr(fullKey, rule.windowSeconds);
    const current = count ?? this.bumpMemory(fullKey, rule.windowSeconds);
    if (current > rule.limit) {
      throw new HttpException(
        'تلاش‌های بیش از حد؛ لطفاً کمی بعد دوباره تلاش کنید',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private bumpMemory(key: string, windowSeconds: number): number {
    const now = Date.now();
    const existing = this.memory.get(key);
    if (!existing || existing.expiresAt <= now) {
      this.sweepMemory(now);
      const entry = { count: 1, expiresAt: now + windowSeconds * 1000 };
      this.memory.set(key, entry);
      return 1;
    }
    existing.count += 1;
    return existing.count;
  }

  private sweepMemory(now: number): void {
    if (this.memory.size < RateLimitService.MEMORY_MAX) return;
    for (const [key, entry] of this.memory) {
      if (entry.expiresAt <= now) this.memory.delete(key);
    }
  }
}

/** Preset rules for the auth surface. */
export const RATE_LIMITS = {
  /** Password login: 10 tries per IP per 15 minutes. */
  login: { bucket: 'login', limit: 10, windowSeconds: 900 } as RateLimitRule,
  /** OTP request: 5 SMS per phone per 15 minutes (cost + spam guard). */
  otpRequestPhone: { bucket: 'otp-req-phone', limit: 5, windowSeconds: 900 } as RateLimitRule,
  /** OTP request per IP: 20 per 15 minutes. */
  otpRequestIp: { bucket: 'otp-req-ip', limit: 20, windowSeconds: 900 } as RateLimitRule,
  /** OTP verify: 10 attempts per phone per 15 minutes (on top of code attempts). */
  otpVerify: { bucket: 'otp-verify', limit: 10, windowSeconds: 900 } as RateLimitRule,
  /** Sign-up: 5 accounts per IP per hour. */
  register: { bucket: 'register', limit: 5, windowSeconds: 3600 } as RateLimitRule,
} as const;
