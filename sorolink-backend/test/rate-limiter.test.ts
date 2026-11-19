import { describe, expect, it } from "vitest";
import { FixedWindowRateLimiter } from "../src/rate-limiter.js";

describe("FixedWindowRateLimiter", () => {
  it("bounds requests and resets without real waiting", () => {
    let now = 0;
    const limiter = new FixedWindowRateLimiter(1_000, 10, () => now);
    expect(limiter.consume("run:client", 1)).toMatchObject({ allowed: true, remaining: 0 });
    expect(limiter.consume("run:client", 1)).toMatchObject({ allowed: false, retryAfterSeconds: 1 });
    now = 1_001;
    expect(limiter.consume("run:client", 1).allowed).toBe(true);
  });

  it("fails closed at key capacity without evicting an active client's quota", () => {
    let now = 0;
    const limiter = new FixedWindowRateLimiter(1_000, 1, () => now);
    expect(limiter.consume("client-a", 1).allowed).toBe(true);
    expect(limiter.consume("client-b", 1)).toMatchObject({ allowed: false, remaining: 0, retryAfterSeconds: 1 });
    expect(limiter.consume("client-a", 1).allowed).toBe(false);

    now = 1_001;
    expect(limiter.consume("client-b", 1).allowed).toBe(true);
  });
});
