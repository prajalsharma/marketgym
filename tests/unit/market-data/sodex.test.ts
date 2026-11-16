import { describe, expect, it, vi } from "vitest";
import bookFixture from "@/lib/market-data/__fixtures__/sodex/mainnet-spot-orderbook-vBTC_vUSDC.json";
import errorFixture from "@/lib/market-data/__fixtures__/sodex/mainnet-error-symbol-not-found.json";
import symbolsFixture from "@/lib/market-data/__fixtures__/sodex/mainnet-spot-symbols.json";
import { MarketDataCache } from "@/lib/market-data/cache";
import { demoOrderBook } from "@/lib/market-data/fixtures";
import { UpstreamError } from "@/lib/market-data/http";
import { OrderBookService } from "@/lib/market-data/services";
import { SoDEXClient } from "@/lib/market-data/sodex/client";
import { toOrderBookSnapshot, toSymbolMeta } from "@/lib/market-data/sodex/normalise";
import { orderBook, spotSymbols } from "@/lib/market-data/sodex/schemas";
import { ApiError } from "@/lib/server/api";

const BASE = "https://mainnet-gw.sodex.dev/api/v1/spot";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function strip(fx: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fx).filter(([k]) => !k.startsWith("_")));
}

/** routes by URL so symbols + orderbook can be served from one fetch mock */
function router(handlers: Record<string, () => Response | Promise<Response>>): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    for (const [needle, h] of Object.entries(handlers)) if (url.includes(needle)) return h();
    return json({ code: -1, error: "symbol not found" });
  }) as typeof fetch;
}

describe("SoDEX normaliser", () => {
  it("computes cumulative depth, spread, mid and bid share from the fixture", () => {
    const meta = toSymbolMeta(spotSymbols.parse(symbolsFixture.data).find((s) => s.name === "vBTC_vUSDC")!);
    const raw = orderBook.parse(bookFixture.data);
    const snap = toOrderBookSnapshot(meta, raw, { kind: "demo", provider: "fixture", sourceUrl: "x", fetchedAt: bookFixture._captured_at });
    expect(snap.market).toBe("vBTC_vUSDC");
    expect(snap.displayName).toBe("BTC/USDC");
    expect(snap.tickSize).toBe(1);
    expect(snap.lotSize).toBe(0.00001);
    expect(snap.bestBid).toBe(75576);
    expect(snap.bestAsk).toBe(75577);
    expect(snap.spread).toBe(1);
    expect(snap.midPrice).toBe(75576.5);
    expect(snap.spreadPercentage).toBeCloseTo((1 / 75576.5) * 100, 6);
    expect(snap.bids[1]!.cumulativeQuantity).toBeCloseTo(0.03275 + 0.02567, 10);
    expect(snap.asks.map((a) => a.price)).toEqual([...snap.asks.map((a) => a.price)].sort((a, b) => a - b));
    expect(snap.bids.map((a) => a.price)).toEqual([...snap.bids.map((a) => a.price)].sort((a, b) => b - a));
    const bidDepth = snap.bids[snap.bids.length - 1]!.cumulativeQuantity;
    const askDepth = snap.asks[snap.asks.length - 1]!.cumulativeQuantity;
    expect(snap.bidShareOfDepth).toBeCloseTo(bidDepth / (bidDepth + askDepth), 6);
    expect(snap.timestamp).toBe(new Date(bookFixture.data.blockTime).toISOString());
  });
});

describe("SoDEXClient", () => {
  it("only ever builds /markets/* URLs", () => {
    const c = new SoDEXClient({ baseUrl: BASE });
    expect(c.url("markets/vBTC_vUSDC/orderbook", { limit: 20 })).toBe(`${BASE}/markets/vBTC_vUSDC/orderbook?limit=20`);
    expect(() => c.url("orders")).toThrow(/only calls \/markets/);
  });

  it("treats code !== 0 as a provider error even on HTTP 200", async () => {
    const c = new SoDEXClient({ baseUrl: BASE, fetchImpl: router({ orderbook: () => json(strip(errorFixture)) }) });
    await expect(c.getOrderBook("BTC_USDC", 5)).rejects.toMatchObject({ provider: "sodex", kind: "provider_error", message: expect.stringContaining("symbol not found") });
  });

  it("rejects malformed payloads", async () => {
    const c = new SoDEXClient({ baseUrl: BASE, fetchImpl: router({ orderbook: () => json({ code: 0, data: { bids: "nope" } }) }) });
    await expect(c.getOrderBook("vBTC_vUSDC")).rejects.toMatchObject({ kind: "malformed" });
  });
});

describe("OrderBookService fallbacks", () => {
  const fixtures = {
    symbols: () => json(strip(symbolsFixture)),
    orderbook: () => json(strip(bookFixture)),
  };

  it("live → cached → demo, each with the right provenance kind", async () => {
    let t = 0;
    const cache = new MarketDataCache();
    let fail = false;
    const fetchImpl = router({
      symbols: fixtures.symbols,
      orderbook: () => (fail ? Promise.reject(Object.assign(new Error("boom"), { name: "TypeError" })) : fixtures.orderbook()),
    });
    const svc = new OrderBookService({ cache, sodex: new SoDEXClient({ baseUrl: BASE, fetchImpl }), now: () => t });

    const live = await svc.getOrderBook("vBTC_vUSDC", 20);
    expect(live.provenance.kind).toBe("live");
    expect(live.provenance.provider).toBe("sodex");
    expect(live.bestBid).toBe(75576);

    t = 5_000;
    const cached = await svc.getOrderBook("vBTC_vUSDC", 20);
    expect(cached.provenance.kind).toBe("cached");

    fail = true;
    t = 20_000; // past the 15 s TTL
    const stale = await svc.getOrderBook("vBTC_vUSDC", 20);
    expect(stale.provenance.kind).toBe("cached");
    expect(stale.provenance.note).toMatch(/serving cached copy/);

    const fresh = new OrderBookService({ cache: new MarketDataCache(), sodex: new SoDEXClient({ baseUrl: BASE, fetchImpl }), now: () => t });
    const demo = await fresh.getOrderBook("vBTC_vUSDC", 20);
    expect(demo.provenance.kind).toBe("demo");
    expect(demo.provenance.provider).toBe("fixture");
    expect(demo.provenance.note).toMatch(/Demo fixture/);
  });

  it("uses demo fixtures with the capture time when no client is configured", async () => {
    const svc = new OrderBookService({ cache: new MarketDataCache(), sodex: null });
    const book = await svc.getOrderBook("vETH_vUSDC", 5);
    expect(book.provenance.kind).toBe("demo");
    expect(book.provenance.fetchedAt).toBe("2026-11-06T05:42:26.000Z");
    expect(book.bids).toHaveLength(5);
    expect(demoOrderBook("vSOL_vUSDC")).toBeNull();
  });

  it("maps an unknown market to not_found", async () => {
    const svc = new OrderBookService({ cache: new MarketDataCache(), sodex: new SoDEXClient({ baseUrl: BASE, fetchImpl: router(fixtures) }) });
    await expect(svc.getOrderBook("BTC_USDC")).rejects.toMatchObject({ code: "not_found" });
    const err = await svc.getOrderBook("BTC_USDC").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
  });

  it("surfaces an UpstreamError only when there is neither cache nor demo data", async () => {
    const fetchImpl = router({ symbols: fixtures.symbols, orderbook: () => json({ code: 0, data: {} }, 500) });
    const svc = new OrderBookService({ cache: new MarketDataCache(), sodex: new SoDEXClient({ baseUrl: BASE, fetchImpl }) });
    const spy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(svc.getOrderBook("vSOL_vUSDC")).rejects.toMatchObject({ code: "upstream_unavailable" });
    expect(spy.mock.calls.some((c) => String(c[0]).includes("sodex") && String(c[0]).includes("500"))).toBe(true);
    spy.mockRestore();
  });

  it("UpstreamError carries provider and status, never the body", () => {
    const e = new UpstreamError("sodex", "http", "HTTP 503", 503);
    expect(e.message).toBe("[sodex] http 503: HTTP 503");
  });
});
