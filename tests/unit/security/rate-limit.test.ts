/**
 * (c) Rate limiting. The market scope allows 60 requests/min per ip
 * (docs/CONTRACTS.md). The 61st call must be rejected with
 * ApiError("rate_limited") → 429, keys must be isolated per ip/scope, and the
 * bucket must refill over time. Exercised directly on lib/server/rate-limit
 * and, when it exists, through GET /api/market/snapshot.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import path from "node:path";
import { type RouteModule, callRoute, fileExists, loadOrSkip, stubLocalEnv } from "./_helpers";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], get: () => undefined, set: () => undefined }),
  headers: async () => new Headers(),
}));

describe("lib/server/rate-limit", () => {
  beforeEach(async () => {
    const { resetRateLimits } = await import("@/lib/server/rate-limit");
    resetRateLimits();
  });

  it("market scope: 60 allowed, 61st throws rate_limited (429)", async () => {
    const { enforceRateLimit, RATE_LIMITS } = await import("@/lib/server/rate-limit");
    const { ApiError } = await import("@/lib/server/api");
    const { API_STATUS } = await import("@/lib/types");
    expect(RATE_LIMITS.market.limit).toBe(60);
    expect(RATE_LIMITS.market.windowMs).toBe(60_000);
    const req = new Request("http://localhost/api/market/snapshot", { headers: { "x-forwarded-for": "198.51.100.1" } });
    for (let i = 0; i < 60; i++) {
      const r = enforceRateLimit(req, "market");
      expect(r.allowed).toBe(true);
    }
    let thrown: unknown;
    try {
      enforceRateLimit(req, "market");
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(ApiError);
    const err = thrown as InstanceType<typeof ApiError>;
    expect(err.code).toBe("rate_limited");
    expect(API_STATUS[err.code]).toBe(429);
    expect((err.details as { retryAfterSeconds: number }).retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it("buckets are isolated per ip and per scope", async () => {
    const { enforceRateLimit } = await import("@/lib/server/rate-limit");
    const a = new Request("http://localhost/x", { headers: { "x-forwarded-for": "198.51.100.2" } });
    const b = new Request("http://localhost/x", { headers: { "x-forwarded-for": "198.51.100.3" } });
    for (let i = 0; i < 60; i++) enforceRateLimit(a, "market");
    expect(() => enforceRateLimit(a, "market")).toThrow();
    expect(enforceRateLimit(b, "market").allowed).toBe(true);
    expect(enforceRateLimit(a, "default").allowed).toBe(true);
    // a user-id subject gets its own bucket, independent of ip
    expect(enforceRateLimit(a, "market", "user-123").allowed).toBe(true);
  });

  it("x-forwarded-for: only the first hop counts; spoofing the list does not split buckets", async () => {
    const { clientIp } = await import("@/lib/server/rate-limit");
    expect(clientIp(new Request("http://l/", { headers: { "x-forwarded-for": "1.1.1.1, 10.0.0.1" } }))).toBe("1.1.1.1");
    expect(clientIp(new Request("http://l/"))).toBe("anonymous");
  });

  it("token bucket refills with time", async () => {
    const { consume } = await import("@/lib/server/rate-limit");
    const policy = { limit: 60, windowMs: 60_000 };
    const t0 = 1_000_000;
    for (let i = 0; i < 60; i++) expect(consume("k", policy, t0).allowed).toBe(true);
    expect(consume("k", policy, t0).allowed).toBe(false);
    // after a full window the bucket is full again
    expect(consume("k", policy, t0 + 60_000).allowed).toBe(true);
    expect(consume("k", policy, t0 + 60_000).remaining).toBe(58);
  });
});

describe("GET /api/market/snapshot through the route", () => {
  const file = "app/api/market/snapshot/route.ts";
  const present = fileExists(file);
  const run = present ? it : it.skip;

  beforeEach(async () => {
    stubLocalEnv(vi, "/tmp/marketgym-rate-limit-unused.json");
    const { resetEnvCache } = await import("@/lib/config/env");
    resetEnvCache();
    const { resetRateLimits } = await import("@/lib/server/rate-limit");
    resetRateLimits();
  });
  afterEach(() => vi.unstubAllEnvs());

  run(`61st request from one ip → 429 rate_limited${present ? "" : " (route not landed yet)"}`, async (ctx) => {
    const mod = await loadOrSkip(ctx, () => import(/* @vite-ignore */ path.resolve(__dirname, "../../..", file)) as Promise<RouteModule>);
    const ip = "198.51.100.9";
    let last = 0;
    for (let i = 1; i <= 60; i++) {
      const { status } = await callRoute(mod, "GET", "/api/market/snapshot", { query: "assets=BTC", headers: { "x-forwarded-for": ip } });
      last = status;
      expect(status, `request ${i}`).not.toBe(429);
    }
    expect([200, 503]).toContain(last);
    const { status, body } = await callRoute(mod, "GET", "/api/market/snapshot", { query: "assets=BTC", headers: { "x-forwarded-for": ip } });
    expect(status).toBe(429);
    expect((body as { error: { code: string } }).error.code).toBe("rate_limited");
    // another ip is unaffected
    const other = await callRoute(mod, "GET", "/api/market/snapshot", { query: "assets=BTC", headers: { "x-forwarded-for": "198.51.100.10" } });
    expect(other.status).not.toBe(429);
  });
});
