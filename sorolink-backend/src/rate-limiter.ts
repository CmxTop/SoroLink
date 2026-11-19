interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export class FixedWindowRateLimiter {
  readonly #buckets = new Map<string, Bucket>();

  constructor(
    private readonly windowMs: number,
    private readonly maxKeys = 10_000,
    private readonly now: () => number = Date.now,
  ) {}

  consume(key: string, limit: number): RateLimitResult {
    const now = this.now();
    this.removeExpired(now);
    let bucket = this.#buckets.get(key);
    if (!bucket) {
      if (this.#buckets.size >= this.maxKeys) {
        let earliestResetAt = Number.POSITIVE_INFINITY;
        for (const item of this.#buckets.values()) earliestResetAt = Math.min(earliestResetAt, item.resetAt);
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.max(1, Math.ceil((earliestResetAt - now) / 1_000)),
        };
      }
      bucket = { count: 0, resetAt: now + this.windowMs };
      this.#buckets.set(key, bucket);
    }
    bucket.count += 1;
    const allowed = bucket.count <= limit;
    return {
      allowed,
      remaining: Math.max(0, limit - bucket.count),
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000)),
    };
  }

  private removeExpired(now: number): void {
    for (const [key, bucket] of this.#buckets) {
      if (bucket.resetAt <= now) this.#buckets.delete(key);
    }
  }
}
