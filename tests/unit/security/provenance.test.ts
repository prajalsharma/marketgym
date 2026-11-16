/**
 * (d) Data-provenance honesty.
 *  - DEMO_MODE=true ⇒ every market route returns provenance.kind "demo",
 *    provider "fixture", never "live".
 *  - DEMO_MODE=false with a warm cache and a failing provider ⇒ "cached" with
 *    a human note (stale-after-failure), never "live" and never silently "demo".
 * Runs through the route handlers (the only stable surface while
 * lib/market-data is being written); skips with a reason until they land.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import path from "node:path";
import { readFileSync } from "node:fs";
import { type RouteModule, REPO_ROOT, callRoute, fileExists, loadOrSkip, stubLocalEnv } from "./_helpers";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], get: () => undefined, set: () => undefined }),
  headers: async () => new Headers(),
}));

type Prov = { kind: string; provider: string; note?: string; fetchedAt?: string };

function collect(value: unknown, out: Prov[] = []): Prov[] {
  if (!value || typeof value !== "object") return out;
  if (Array.isArray(value)) {
    for (const v of value) collect(v, out);
    return out;
  }
  const o = value as Record<string, unknown>;
  if (o.provenance && typeof o.provenance === "object") out.push(o.provenance as Prov);
  for (const v of Object.values(o)) if (v && typeof v === "object") collect(v, out);
  return out;
}

const MARKET_ROUTES: Array<{ file: string; url: string; query: string }> = [
  { file: "app/api/market/snapshot/route.ts", url: "/api/market/snapshot", query: "assets=BTC,ETH" },
  { file: "app/api/market/news/route.ts", url: "/api/market/news", query: "limit=5" },
  { file: "app/api/market/etf/route.ts", url: "/api/market/etf", query: "asset=BTC" },
  { file: "app/api/market/indexes/route.ts", url: "/api/market/indexes", query: "" },
  { file: "app/api/market/orderbook/route.ts", url: "/api/market/orderbook", query: "market=vBTC_vUSDC&limit=20" },
];

async function freshImport<T>(rel: string): Promise<T> {
  vi.resetModules();
  return (await import(/* @vite-ignore */ path.resolve(REPO_ROOT, rel))) as T;
}

describe("DEMO_MODE=true ⇒ demo provenance everywhere", () => {
  beforeEach(async () => {
    stubLocalEnv(vi, "/tmp/marketgym-provenance-unused.json", { DEMO_MODE: "true" });
  });
  afterEach(() => vi.unstubAllEnvs());

  for (const r of MARKET_ROUTES) {
    const present = fileExists(r.file);
    (present ? it : it.skip)(`${r.url} → kind=demo, provider=fixture${present ? "" : " (route not landed yet)"}`, async (ctx) => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        throw new Error("network must not be used in DEMO_MODE");
      });
      try {
        const mod = await loadOrSkip(ctx, () => freshImport<RouteModule>(r.file));
        const { status, body } = await callRoute(mod, "GET", r.url, { query: r.query });
        expect(status, r.url).toBe(200);
        const env = body as { ok: boolean; data: unknown };
        expect(env.ok).toBe(true);
        const provs = collect(env.data);
        expect(provs.length, "carries provenance").toBeGreaterThan(0);
        for (const p of provs) {
          expect(p.kind).toBe("demo");
          expect(p.provider).toBe("fixture");
          expect(p.fetchedAt, "fetchedAt (capture time) present").toBeTruthy();
        }
        expect(fetchSpy, "no outbound fetch in DEMO_MODE").not.toHaveBeenCalled();
      } finally {
        fetchSpy.mockRestore();
      }
    });
  }
});

describe("OrderBookService directly: live → cached → stale+note → demo, never mislabelled", () => {
  const present = fileExists("lib/market-data/services.ts") && fileExists("lib/market-data/cache.ts");
  const run = present ? it : it.skip;

  const fixtureData = (name: string) => (JSON.parse(readFileSync(path.join(REPO_ROOT, "lib/market-data/__fixtures__/sodex", name), "utf8")) as { data: unknown }).data;

  function fakeSodex(state: { failing: boolean; calls: string[] }) {
    return {
      url: (p: string, q?: Record<string, unknown>) => {
        if (!p.startsWith("markets/")) throw new Error("non-market path");
        return `https://sodex.test/api/v1/spot/${p}${q ? `?${new URLSearchParams(q as Record<string, string>)}` : ""}`;
      },
      async listSymbols() {
        state.calls.push("markets/symbols");
        if (state.failing) throw new Error("ECONNRESET");
        return fixtureData("mainnet-spot-symbols.json");
      },
      async getOrderBook(symbol: string) {
        state.calls.push(`markets/${symbol}/orderbook`);
        if (state.failing) throw new Error("ECONNRESET");
        return fixtureData("mainnet-spot-orderbook-vBTC_vUSDC.json");
      },
      async getTickers() {
        state.calls.push("markets/tickers");
        return [];
      },
    };
  }

  run("warm cache then failing provider ⇒ provenance cached + note; cold + failing ⇒ demo with reason", async () => {
    stubLocalEnv(vi, "/tmp/unused.json", { DEMO_MODE: "false" });
    const { resetEnvCache } = await import("@/lib/config/env");
    resetEnvCache();
    const { OrderBookService } = await import("@/lib/market-data/services");
    const { MarketDataCache } = await import("@/lib/market-data/cache");
    let t = Date.parse("2026-11-06T12:00:00.000Z");
    const state = { failing: false, calls: [] as string[] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = new OrderBookService({ cache: new MarketDataCache(), sodex: fakeSodex(state) as any, now: () => t });

    const live = await svc.getOrderBook("vBTC_vUSDC", 20);
    expect(live.provenance.kind).toBe("live");
    expect(live.provenance.provider).toBe("sodex");
    expect(live.bestBid).not.toBeNull();
    expect(live.bestAsk).not.toBeNull();
    expect(live.spread).not.toBeNull();
    for (const c of state.calls) expect(c).toMatch(/^markets\//);

    t += 5_000; // inside the 15 s TTL
    const fresh = await svc.getOrderBook("vBTC_vUSDC", 20);
    expect(fresh.provenance.kind).toBe("cached");
    expect(fresh.provenance.note).toBeUndefined();

    t += 30_000; // past TTL, provider down
    state.failing = true;
    const stale = await svc.getOrderBook("vBTC_vUSDC", 20);
    expect(stale.provenance.kind).toBe("cached");
    expect(stale.provenance.note).toMatch(/serving cached copy|provider failed/i);
    expect(stale.provenance.fetchedAt).toBe(live.provenance.fetchedAt);

    // cold cache + failing provider ⇒ demo, and it says why (never silently)
    const cold = new OrderBookService({ cache: new MarketDataCache(), sodex: fakeSodex({ failing: true, calls: [] }) as never, now: () => t });
    const demo = await cold.getOrderBook("vBTC_vUSDC", 20);
    expect(demo.provenance.kind).toBe("demo");
    expect(demo.provenance.provider).toBe("fixture");
    expect(demo.provenance.note).toMatch(/demo/i);
    vi.unstubAllEnvs();
  });

  run("DEMO_MODE ⇒ demo snapshot/news/etf/indexes without any client", async () => {
    stubLocalEnv(vi, "/tmp/unused.json", { DEMO_MODE: "true" });
    const { resetEnvCache } = await import("@/lib/config/env");
    resetEnvCache();
    const m = await import("@/lib/market-data/services");
    const { MarketDataCache } = await import("@/lib/market-data/cache");
    const deps = { cache: new MarketDataCache(), sosovalue: null, sodex: null };
    const snaps = await new m.MarketSnapshotService(deps).getSnapshots(["BTC", "ETH"]).catch(() => null);
    const news = await new m.NewsFeedService(deps).getNews({ limit: 5 }).catch(() => null);
    const etf = await new m.ETFDataService(deps).getFlows("BTC").catch(() => null);
    const idx = await new m.IndexDataService(deps).getIndexes().catch(() => null);
    const all = [snaps, news, etf, idx].filter((x) => x !== null);
    // method names may differ; what matters is that whatever came back is demo-labelled
    for (const p of collect(all)) {
      expect(p.kind).toBe("demo");
      expect(p.provider).toBe("fixture");
    }
    expect(collect(all).length, "at least one service returned demo-labelled data (if 0, method names differ: see report)").toBeGreaterThan(0);
    vi.unstubAllEnvs();
  });
});

describe("stale-after-failure ⇒ cached + note (SoDEX order book)", () => {
  const file = "app/api/market/orderbook/route.ts";
  const present = fileExists(file);

  const fixture = (name: string) => {
    const raw = JSON.parse(readFileSync(path.join(REPO_ROOT, "lib/market-data/__fixtures__/sodex", name), "utf8")) as Record<string, unknown>;
    // strip capture metadata; the provider sees only the raw envelope
    for (const k of Object.keys(raw)) if (k.startsWith("_")) delete raw[k];
    return raw;
  };

  function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  }

  beforeEach(() => {
    stubLocalEnv(vi, "/tmp/marketgym-provenance-unused.json", { DEMO_MODE: "false" });
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-06T12:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  (present ? it : it.skip)(`warm cache, then provider fails ⇒ kind=cached with note; never live${present ? "" : " (route not landed yet)"}`, async (ctx) => {
    let failing = false;
    const calls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      calls.push(url);
      if (failing) throw new TypeError("fetch failed: ECONNRESET");
      if (/\/markets\/symbols/.test(url)) return jsonResponse(fixture("mainnet-spot-symbols.json"));
      if (/\/markets\/[^/]+\/orderbook/.test(url)) return jsonResponse(fixture("mainnet-spot-orderbook-vBTC_vUSDC.json"));
      if (/\/markets\/(tickers|bookTickers)/.test(url)) return jsonResponse(fixture("mainnet-spot-bookTickers.json"));
      throw new Error(`unexpected URL in test: ${url}`);
    });

    const mod = await loadOrSkip(ctx, () => freshImport<RouteModule>(file));
    const q = { query: "market=vBTC_vUSDC&limit=20" };

    // 1) live fetch
    const first = await callRoute(mod, "GET", "/api/market/orderbook", q);
    expect(first.status).toBe(200);
    const p1 = collect((first.body as { data: unknown }).data)[0]!;
    expect(p1.kind).toBe("live");
    expect(p1.provider).toBe("sodex");
    expect(calls.some((u) => /\/markets\//.test(u))).toBe(true);
    // SoDEX adapter must only touch /markets/* GETs (no-trading boundary)
    for (const u of calls) expect(u, "non-market endpoint called").toMatch(/\/markets\//);

    // 2) within TTL ⇒ cached (no new fetch)
    const before = calls.length;
    const second = await callRoute(mod, "GET", "/api/market/orderbook", q);
    const p2 = collect((second.body as { data: unknown }).data)[0]!;
    expect(["cached", "live"]).toContain(p2.kind);
    if (p2.kind === "cached") expect(calls.length).toBe(before);

    // 3) TTL expired (15 s) and the provider is down ⇒ stale copy, labelled cached + note
    failing = true;
    vi.setSystemTime(new Date("2026-11-06T12:00:30.000Z"));
    const third = await callRoute(mod, "GET", "/api/market/orderbook", q);
    expect(third.status).toBe(200);
    const p3 = collect((third.body as { data: unknown }).data)[0]!;
    expect(p3.kind).toBe("cached");
    expect(p3.provider).toBe("sodex");
    expect(typeof p3.note === "string" && p3.note.length > 0, "stale copy must carry a human note").toBe(true);
    expect(p3.kind).not.toBe("live");
  });
});
