import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { body, get, noParams, okData, setupLocalEnv } from "./helpers";
import type { MarketEtfResponse, MarketIndexesResponse, MarketNewsResponse, MarketOrderBookResponse, MarketSnapshotResponse } from "@/lib/types";

let cleanup: () => Promise<void>;

beforeAll(async () => {
  ({ cleanup } = await setupLocalEnv());
});
afterAll(async () => cleanup());

describe("/api/market/* (public, rate-limited, provenance always present)", () => {
  it("GET /api/market/orderbook returns a normalised book with provenance", async () => {
    const { GET } = await import("@/app/api/market/orderbook/route");
    const res = await GET(get("/api/market/orderbook?market=vBTC_vUSDC&limit=10"), noParams);
    expect(res.status).toBe(200);
    const book = await okData<MarketOrderBookResponse>(res);
    expect(book.market).toBe("vBTC_vUSDC");
    expect(book.bids).toHaveLength(10);
    expect(book.bestBid).toBe(75576);
    expect(book.spread).toBe(1);
    expect(["live", "cached", "demo"]).toContain(book.provenance.kind);
    expect(book.provenance.kind).toBe("demo"); // DEMO_MODE in tests
    expect(book.provenance.fetchedAt).toBe("2026-11-06T05:42:24.000Z");
  });

  it("GET /api/market/snapshot validates the assets query and returns one snapshot per asset", async () => {
    const { GET } = await import("@/app/api/market/snapshot/route");
    const ok = await okData<MarketSnapshotResponse>(await GET(get("/api/market/snapshot?assets=btc,ETH"), noParams));
    expect(ok.map((s) => s.asset)).toEqual(["BTC", "ETH"]);
    expect(ok.every((s) => s.provenance.kind === "demo" && s.provenance.provider === "fixture")).toBe(true);

    const bad = await GET(get("/api/market/snapshot?assets=not-an-asset!"), noParams);
    expect(bad.status).toBe(400);
    const err = await body(bad);
    expect(err.ok).toBe(false);
    if (!err.ok) expect(err.error.code).toBe("validation_error");

    const unknown = await GET(get("/api/market/snapshot?assets=DOGE"), noParams);
    expect(unknown.status).toBe(404);
  });

  it("GET /api/market/news, /etf, /indexes serve labelled demo data", async () => {
    const news = await okData<MarketNewsResponse>(await (await import("@/app/api/market/news/route")).GET(get("/api/market/news?limit=2&category=macro"), noParams));
    expect(news).toHaveLength(2);
    expect(news[0]!.category).toBe("macro");
    expect(news.every((n) => n.provenance.kind === "demo" && n.summary.length <= 600)).toBe(true);

    const etf = await okData<MarketEtfResponse>(await (await import("@/app/api/market/etf/route")).GET(get("/api/market/etf?asset=eth"), noParams));
    expect(etf[0]!.asset).toBe("ETH");
    expect(etf[0]!.provenance.kind).toBe("demo");

    const idx = await okData<MarketIndexesResponse>(await (await import("@/app/api/market/indexes/route")).GET(get("/api/market/indexes"), noParams));
    expect(idx.length).toBeGreaterThan(0);
    expect(idx.every((i) => i.provenance.kind === "demo")).toBe(true);
  });

  it("GET /api/market/orderbook 404s for an unlisted market and 400s for a malformed one", async () => {
    const { GET } = await import("@/app/api/market/orderbook/route");
    expect((await GET(get("/api/market/orderbook?market=vSOL_vUSDC"), noParams)).status).toBe(404);
    expect((await GET(get("/api/market/orderbook?market=../etc"), noParams)).status).toBe(400);
    expect((await GET(get("/api/market/orderbook?market=vBTC_vUSDC&limit=9999"), noParams)).status).toBe(400);
  });

  it("rate-limits by ip at 60/min with a 429 envelope", async () => {
    const { GET } = await import("@/app/api/market/indexes/route");
    const headers = { "x-forwarded-for": "203.0.113.7" };
    let last = 200;
    for (let i = 0; i < 61; i++) last = (await GET(get("/api/market/indexes", headers), noParams)).status;
    expect(last).toBe(429);
    const res = await GET(get("/api/market/indexes", headers), noParams);
    const err = await body(res);
    expect(err.ok).toBe(false);
    if (!err.ok) expect(err.error.code).toBe("rate_limited");
    // another ip is unaffected
    expect((await GET(get("/api/market/indexes", { "x-forwarded-for": "203.0.113.8" }), noParams)).status).toBe(200);
  });
});
