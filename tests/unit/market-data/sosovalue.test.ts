import { describe, expect, it, vi } from "vitest";
import currenciesFixture from "@/lib/market-data/__fixtures__/sosovalue/currencies.list.json";
import snapshotFixture from "@/lib/market-data/__fixtures__/sosovalue/currencies.market-snapshot.json";
import etfFixture from "@/lib/market-data/__fixtures__/sosovalue/etfs.summary-history.json";
import constituentsFixture from "@/lib/market-data/__fixtures__/sosovalue/indices.constituents.json";
import indexListFixture from "@/lib/market-data/__fixtures__/sosovalue/indices.list.json";
import indexSnapshotFixture from "@/lib/market-data/__fixtures__/sosovalue/indices.market-snapshot.json";
import newsFixture from "@/lib/market-data/__fixtures__/sosovalue/news.pick.json";
import { MarketDataCache } from "@/lib/market-data/cache";
import { buildEvidencePack, parseRequirement } from "@/lib/market-data/evidence";
import { demoEtfFlows, demoIndexes, demoNews, demoSnapshot, SOSOVALUE_DOC_TIME } from "@/lib/market-data/fixtures";
import { ETFDataService, IndexDataService, MarketSnapshotService, NewsFeedService, OrderBookService } from "@/lib/market-data/services";
import { SoSoValueClient } from "@/lib/market-data/sosovalue/client";
import { categoriseNews, htmlToText, toEtfFlowSeries, toNewsEvidence, truncateText } from "@/lib/market-data/sosovalue/normalise";
import { etfSummaryHistory, newsPage } from "@/lib/market-data/sosovalue/schemas";
import { TokenBucket } from "@/lib/market-data/token-bucket";
import type { DataProvenance } from "@/lib/types";

const BASE = "https://openapi.sosovalue.com/openapi/v1";
const prov: DataProvenance = { kind: "live", provider: "sosovalue", sourceUrl: "x", fetchedAt: "2026-11-06T10:00:00.000Z" };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
function payload(fx: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fx).filter(([k]) => !k.startsWith("_")));
}
function router(handlers: Record<string, () => Response | Promise<Response>>, seen: string[] = []): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    seen.push(url);
    const headers = new Headers(init?.headers);
    if (headers.get("x-soso-api-key") !== "test-key") return json({ code: 400101, message: "API Key is invalid or does not exist" }, 401);
    for (const [needle, h] of Object.entries(handlers)) if (url.includes(needle)) return h();
    return new Response("<html>Attention Required</html>", { status: 403, headers: { "content-type": "text/html" } });
  }) as typeof fetch;
}
const btcList = { code: 0, message: "success", data: [{ currency_id: "1673723677362319866", symbol: "btc", name: "Bitcoin" }, ...currenciesFixture.data] };

describe("SoSoValue normalisers", () => {
  it("sanitises news HTML to text and truncates summaries to 600 chars", () => {
    expect(htmlToText("<p>Hello <b>world</b> &amp; friends<script>alert(1)</script></p><p>Next</p>")).toBe("Hello world & friends\nNext");
    const long = "x".repeat(2000);
    expect(truncateText(long).length).toBeLessThanOrEqual(600);
    const item = newsPage.parse(newsFixture.data).list[0]!;
    const ev = toNewsEvidence({ ...item, content: `<p>${"word ".repeat(300)}</p>` }, prov);
    expect(ev.summary.length).toBeLessThanOrEqual(600);
    expect(ev.summary).not.toMatch(/<[^>]+>/);
    expect(ev.id).toBe("sosovalue:news123");
    expect(ev.category).toBe("etf"); // tags ETF
    expect(ev.publishedAt).toBe(new Date(1677151845000).toISOString());
    expect(ev.provenance).toBe(prov);
  });

  it("categorises by tags then category int", () => {
    expect(categoriseNews({ category: 1, tags: ["CPI"], title: null })).toBe("macro");
    expect(categoriseNews({ category: 2, tags: [], title: "Deep dive" })).toBe("research");
    expect(categoriseNews({ category: 1, tags: [], title: "Markets" })).toBe("market");
    expect(categoriseNews({ category: 1, tags: ["SEC"], title: "" })).toBe("regulation");
  });

  it("sorts ETF flows ascending and sets latest", () => {
    const series = toEtfFlowSeries("BTC", etfSummaryHistory.parse(etfFixture.data), prov);
    expect(series.points.map((p) => p.date)).toEqual(["2024-04-11", "2024-04-12"]);
    expect(series.latest?.netInflowUsd).toBe(-55066297);
    expect(series.latest?.totalNetAssetsUsd).toBe(56216535367);
  });
});

describe("demo fixtures", () => {
  it("are deterministic, labelled demo and dated by the fixture", () => {
    const a = demoSnapshot("BTC")!;
    const b = demoSnapshot("BTC")!;
    expect(a).toEqual(b);
    expect(a.provenance.kind).toBe("demo");
    expect(a.provenance.provider).toBe("fixture");
    expect(a.provenance.fetchedAt).toBe("2026-11-06T05:43:10.000Z");
    expect(a.price).toBe(75529);
    expect(demoSnapshot("ETH")!.price).toBeCloseTo(2223.35, 2);
    expect(demoSnapshot("DOGE")).toBeNull();
    expect(demoNews(10).every((n) => n.provenance.kind === "demo" && n.provenance.fetchedAt === SOSOVALUE_DOC_TIME)).toBe(true);
    expect(demoNews(10, "macro")[0]!.category).toBe("macro");
    expect(demoEtfFlows("ETH").provenance.note).toMatch(/BTC series/);
    expect(demoIndexes().map((i) => i.id)).toEqual(["ssimag7", "ssilayer1"]);
    expect(demoIndexes()[0]!.percentageChange24h).toBeCloseTo(-0.16, 6);
  });
});

describe("SoSoValueClient", () => {
  it("sends the api key header, resolves currency ids at runtime and returns live snapshots", async () => {
    const seen: string[] = [];
    const fetchImpl = router(
      {
        "/currencies/1673723677362319866/market-snapshot": () => json(payload(snapshotFixture)),
        "/currencies": () => json(btcList),
      },
      seen,
    );
    const svc = new MarketSnapshotService({ cache: new MarketDataCache(), sosovalue: new SoSoValueClient({ baseUrl: BASE, apiKey: "test-key", fetchImpl }) });
    const [btc] = await svc.getSnapshots(["BTC"]);
    expect(btc!.provenance.kind).toBe("live");
    expect(btc!.provenance.provider).toBe("sosovalue");
    expect(btc!.name).toBe("Bitcoin");
    expect(btc!.price).toBe(458);
    expect(btc!.volume24h).toBe(4381082458);
    expect(seen.some((u) => u.endsWith("/currencies"))).toBe(true);
    // id was looked up, not hard-coded
    expect(seen.some((u) => u.includes("/currencies/1673723677362319866/market-snapshot"))).toBe(true);
  });

  it("falls back to demo (never live) on 401 / 429 / malformed / code != 0 / budget exhaustion", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const cases: Array<[string, () => Response]> = [
      ["429", () => json({ code: 42901, message: "Rate limit exceeded" }, 429)],
      ["malformed", () => new Response("{nope", { status: 200, headers: { "content-type": "application/json" } })],
      ["code -1", () => json({ code: 500001, message: "Internal" })],
      ["bad shape", () => json({ code: 0, data: [{ nope: true }] })],
    ];
    for (const [, handler] of cases) {
      const svc = new NewsFeedService({ cache: new MarketDataCache(), sosovalue: new SoSoValueClient({ baseUrl: BASE, apiKey: "test-key", fetchImpl: router({ "/news/pick": handler }) }) });
      const news = await svc.getNews({ limit: 3 });
      expect(news.length).toBeGreaterThan(0);
      expect(news.every((n) => n.provenance.kind === "demo")).toBe(true);
      expect(news[0]!.provenance.note).toMatch(/sosovalue unavailable/);
    }
    // wrong key → 401 → demo
    const bad = new NewsFeedService({ cache: new MarketDataCache(), sosovalue: new SoSoValueClient({ baseUrl: BASE, apiKey: "wrong", fetchImpl: router({}) }) });
    expect((await bad.getNews())[0]!.provenance.kind).toBe("demo");
    // budget exhausted → demo without a network call
    const seen: string[] = [];
    const bucket = new TokenBucket(0, 60_000);
    const budget = new NewsFeedService({ cache: new MarketDataCache(), sosovalue: new SoSoValueClient({ baseUrl: BASE, apiKey: "test-key", fetchImpl: router({}, seen), bucket }) });
    expect((await budget.getNews())[0]!.provenance.kind).toBe("demo");
    expect(seen).toHaveLength(0);
    expect(warn.mock.calls.some((c) => String(c[0]).includes("sosovalue") && String(c[0]).includes("429"))).toBe(true);
    warn.mockRestore();
  });

  it("serves a stale cached copy with a note when the provider starts failing", async () => {
    let t = 0;
    let fail = false;
    const fetchImpl = router({ "/etfs/summary-history": () => (fail ? json({ code: 500301 }, 503) : json(payload(etfFixture))) });
    const svc = new ETFDataService({ cache: new MarketDataCache(), sosovalue: new SoSoValueClient({ baseUrl: BASE, apiKey: "test-key", fetchImpl }), now: () => t });
    const live = await svc.getFlows("BTC");
    expect(live.provenance.kind).toBe("live");
    expect(live.provenance.asOf).toBe("2024-04-12T00:00:00.000Z");
    fail = true;
    t = 16 * 60_000;
    const stale = await svc.getFlows("BTC");
    expect(stale.provenance.kind).toBe("cached");
    expect(stale.provenance.note).toMatch(/serving cached copy/);
    expect(stale.points).toHaveLength(2);
  });

  it("builds live index snapshots from list + constituents + snapshot", async () => {
    const fetchImpl = router({
      "/constituents": () => json(payload(constituentsFixture)),
      "/market-snapshot": () => json(payload(indexSnapshotFixture)),
      "/indices": () => json(payload(indexListFixture)),
      "/currencies": () => json(btcList),
    });
    const svc = new IndexDataService({ cache: new MarketDataCache(), sosovalue: new SoSoValueClient({ baseUrl: BASE, apiKey: "test-key", fetchImpl }) });
    const idx = await svc.getIndexes();
    expect(idx).toHaveLength(2);
    expect(idx[0]!.provenance.kind).toBe("live");
    expect(idx[0]!.constituents[0]).toEqual({ symbol: "BTC", name: "Bitcoin", weight: 0.31 });
    expect(idx[0]!.value).toBe(20.93);
  });

  it("sosovalueEnabled=false → demo without network", async () => {
    const svc = new MarketSnapshotService({ cache: new MarketDataCache(), sosovalue: null });
    const [eth] = await svc.getSnapshots(["eth"]);
    expect(eth!.asset).toBe("ETH");
    expect(eth!.provenance.kind).toBe("demo");
    expect(eth!.provenance.note).toMatch(/no SoSoValue API key/);
  });
});

describe("buildEvidencePack", () => {
  it("parses requirement tokens", () => {
    expect(parseRequirement("snapshot:btc")).toEqual({ kind: "snapshot", arg: "BTC" });
    expect(parseRequirement("news:etf")).toEqual({ kind: "news", arg: "etf" });
    expect(parseRequirement("news:sports")).toBeNull();
    expect(parseRequirement("etf:ETH")).toEqual({ kind: "etf", arg: "ETH" });
    expect(parseRequirement("index:all")).toEqual({ kind: "index", arg: "all" });
    expect(parseRequirement("orderbook:vBTC_vUSDC")).toEqual({ kind: "orderbook", arg: "vBTC_vUSDC" });
    expect(parseRequirement("orderbook:../x")).toBeNull();
  });

  it("assembles a pack from all services with provenance on every item", async () => {
    const cache = new MarketDataCache();
    const deps = {
      snapshots: new MarketSnapshotService({ cache, sosovalue: null }),
      news: new NewsFeedService({ cache, sosovalue: null }),
      etf: new ETFDataService({ cache, sosovalue: null }),
      indexes: new IndexDataService({ cache, sosovalue: null }),
      orderBooks: new OrderBookService({ cache, sodex: null }),
    };
    const pack = await buildEvidencePack(["snapshot:BTC", "snapshot:ETH", "news:market", "news:etf", "etf:BTC", "index:all", "orderbook:vBTC_vUSDC", "bogus:thing"], deps);
    expect(pack.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(pack.snapshots.map((s) => s.asset)).toEqual(["BTC", "ETH"]);
    expect(pack.news.length).toBeGreaterThan(0);
    expect(new Set(pack.news.map((n) => n.id)).size).toBe(pack.news.length);
    expect(pack.etfFlows[0]!.asset).toBe("BTC");
    expect(pack.indexes.length).toBe(2);
    expect(pack.orderBooks[0]!.market).toBe("vBTC_vUSDC");
    const all = [...pack.snapshots, ...pack.news, ...pack.etfFlows, ...pack.indexes, ...pack.orderBooks];
    expect(all.every((x) => x.provenance.kind === "demo")).toBe(true);
  });
});
