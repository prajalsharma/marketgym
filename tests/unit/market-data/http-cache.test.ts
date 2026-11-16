import { describe, expect, it, vi } from "vitest";
import { MarketDataCache } from "@/lib/market-data/cache";
import { fetchJson, UpstreamError } from "@/lib/market-data/http";
import { TokenBucket } from "@/lib/market-data/token-bucket";

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

describe("fetchJson", () => {
  it("parses JSON on 200", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ ok: 1 }));
    const res = await fetchJson("https://x.test/a", { provider: "sodex", fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(res.body).toEqual({ ok: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("maps 429 to an http UpstreamError with retry-after and does not retry", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ code: 42901 }, 429, { "retry-after": "45" }));
    await expect(fetchJson("https://x.test/a", { provider: "sosovalue", fetchImpl: fetchImpl as unknown as typeof fetch })).rejects.toMatchObject({
      kind: "http",
      status: 429,
      provider: "sosovalue",
      retryAfterMs: 45_000,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries once on 5xx then succeeds", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse({ e: 1 }, 503)).mockResolvedValueOnce(jsonResponse({ ok: true }));
    const res = await fetchJson("https://x.test/a", { provider: "sodex", fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(res.body).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("flags malformed JSON and HTML bodies", async () => {
    const fetchImpl = vi.fn(async () => new Response("<html>Attention Required</html>", { status: 200, headers: { "content-type": "text/html" } }));
    await expect(fetchJson("https://x.test/a", { provider: "sosovalue", fetchImpl: fetchImpl as unknown as typeof fetch })).rejects.toMatchObject({ kind: "malformed" });
    const broken = vi.fn(async () => new Response("{not json", { status: 200, headers: { "content-type": "application/json" } }));
    await expect(fetchJson("https://x.test/a", { provider: "sosovalue", fetchImpl: broken as unknown as typeof fetch })).rejects.toMatchObject({ kind: "malformed" });
  });

  it("times out and reports kind=timeout (after one retry)", async () => {
    const fetchImpl = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
        }),
    );
    const err = await fetchJson("https://x.test/a", { provider: "sodex", fetchImpl: fetchImpl as unknown as typeof fetch, timeoutMs: 10 }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UpstreamError);
    expect((err as UpstreamError).kind).toBe("timeout");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe("MarketDataCache", () => {
  it("serves live, then cached within TTL, with provenance", async () => {
    let t = 1_000_000;
    const cache = new MarketDataCache();
    const fetch = vi.fn(async () => ({ v: 1 }));
    const opts = { key: "k", ttlMs: 1000, provider: "sodex" as const, sourceUrl: "https://s", fetch, now: () => t };
    const a = await cache.get(opts);
    expect(a.provenance.kind).toBe("live");
    expect(a.provenance.fetchedAt).toBe(new Date(t).toISOString());
    t += 500;
    const b = await cache.get(opts);
    expect(b.provenance.kind).toBe("cached");
    expect(b.value).toEqual({ v: 1 });
    expect(fetch).toHaveBeenCalledTimes(1);
    t += 600;
    const c = await cache.get(opts);
    expect(c.provenance.kind).toBe("live");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("serves a stale copy with a note after a failure, and throws when nothing is cached", async () => {
    let t = 0;
    const cache = new MarketDataCache();
    const fetch = vi.fn<() => Promise<{ v: number }>>().mockResolvedValueOnce({ v: 1 }).mockRejectedValueOnce(new UpstreamError("sodex", "timeout", "slow"));
    const opts = { key: "k", ttlMs: 100, provider: "sodex" as const, sourceUrl: "https://s", fetch, now: () => t };
    await cache.get(opts);
    t = 200;
    const stale = await cache.get(opts);
    expect(stale.provenance.kind).toBe("cached");
    expect(stale.provenance.note).toMatch(/serving cached copy/);
    expect(stale.value).toEqual({ v: 1 });

    const empty = new MarketDataCache();
    await expect(empty.get({ ...opts, key: "none", fetch: async () => { throw new UpstreamError("sodex", "network", "down"); } })).rejects.toBeInstanceOf(UpstreamError);
  });

  it("de-duplicates concurrent fetches for the same key", async () => {
    const cache = new MarketDataCache();
    let calls = 0;
    const fetch = async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 5));
      return { calls };
    };
    const opts = { key: "k", ttlMs: 1000, provider: "sodex" as const, sourceUrl: "https://s", fetch };
    const [a, b] = await Promise.all([cache.get(opts), cache.get(opts)]);
    expect(calls).toBe(1);
    expect(a.value).toEqual(b.value);
  });
});

describe("TokenBucket", () => {
  it("allows capacity requests per window and refills over time", () => {
    const b = new TokenBucket(3, 3000, 0);
    expect(b.tryTake(0)).toBe(true);
    expect(b.tryTake(0)).toBe(true);
    expect(b.tryTake(0)).toBe(true);
    expect(b.tryTake(0)).toBe(false);
    expect(b.msUntilNext(0)).toBe(1000);
    expect(b.tryTake(1000)).toBe(true);
  });
});
