import { describe, expect, it, vi } from "vitest";
import perpsBookFx from "@/lib/market-data/__fixtures__/sodex/mainnet-perps-orderbook-ANT-USD.json";
import perpsSymbolsFx from "@/lib/market-data/__fixtures__/sodex/mainnet-perps-symbols.json";
import antBookFx from "@/lib/market-data/__fixtures__/sodex/mainnet-spot-orderbook-vANT_vUSDC.json";
import antSymbolFx from "@/lib/market-data/__fixtures__/sodex/mainnet-spot-symbol-vANT_vUSDC.json";
import feedFx from "@/lib/market-data/__fixtures__/sodex/rewards-lottery-feed.json";
import metaFx from "@/lib/market-data/__fixtures__/sodex/rewards-lottery-meta.json";
import weightsFx from "@/lib/market-data/__fixtures__/sodex/rewards-volume-weights.json";
import weekFx from "@/lib/market-data/__fixtures__/sodex/rewards-week-info.json";
import { MarketDataCache } from "@/lib/market-data/cache";
import { demoOrderBook } from "@/lib/market-data/fixtures";
import { orderBookQuerySchema } from "@/lib/market-data/params";
import { OrderBookService, RewardsDataService } from "@/lib/market-data/services";
import { isAllowedSodexPath } from "@/lib/market-data/sodex/allow-list";
import { SoDEXClient } from "@/lib/market-data/sodex/client";
import { toOrderBookSnapshot, toPerpsSymbolMeta } from "@/lib/market-data/sodex/normalise";
import { SoDEXPublicClient } from "@/lib/market-data/sodex/public-client";
import { orderBook, spotSymbols } from "@/lib/market-data/sodex/schemas";
import { FEED_FILTER_NOTE, toRewardFeed, toRewardsIncentives } from "@/lib/market-data/sodex/wealth-normalise";
import { lotteryFeed, lotteryMeta, volumeWeights, weekInfo } from "@/lib/market-data/sodex/wealth-schemas";
import type { DataProvenance } from "@/lib/types";

const ROOT = "https://mainnet-gw.sodex.dev/api/v1";
const P: DataProvenance = { kind: "demo", provider: "fixture", sourceUrl: "x", fetchedAt: "2026-11-27T09:50:00.000Z" };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
function strip(fx: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fx).filter(([k]) => !k.startsWith("_")));
}
function router(handlers: Array<[string, () => Response]>, calls?: string[]): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    calls?.push(url);
    for (const [needle, h] of handlers) if (url.includes(needle)) return h();
    return json({ code: -1, error: "symbol not found" });
  }) as typeof fetch;
}

describe("SoDEX allow-list", () => {
  it("allows exactly the public reads in CONTRACTS", () => {
    for (const p of [
      "/api/v1/spot/markets/symbols",
      "/api/v1/spot/markets/vANT_vUSDC/orderbook",
      "/api/v1/perps/markets/ANT-USD/orderbook",
      "/api/v1/perps/markets/symbols",
      "/api/v1/wealth/funds",
      "/api/v1/wealth/funds/Morpho-Earn",
      "/api/v1/wealth/funds/vQQQ/price-history",
      "/api/v1/wealth/funds/vQQQ/dca-history",
      "/api/v1/wealth/markets",
      "/api/v1/sopoints/volume-weights",
      "/api/v1/sopoints/week/info",
      "/api/v1/lottery/meta",
      "/api/v1/lottery/feed",
    ])
      expect(isAllowedSodexPath(p), p).toBe(true);
  });

  it("rejects auth, per-user, deposit, redemption, RFQ, order and claim paths", () => {
    for (const p of [
      "/api/v1/wealth/users/x/fund-details",
      "/api/v1/lottery/treasure/open",
      "/api/v1/auth/nonce",
      "/api/v1/auth/verify",
      "/api/v1/wealth/funds/vQQQ/deposits",
      "/api/v1/wealth/funds/vQQQ/redemptions",
      "/api/v1/wealth/rfq/quote",
      "/api/v1/spot/orders",
      "/api/v1/perps/accounts/0xabc/balances",
      "/api/v1/sopoints/claim",
      "/api/v1/lottery/claim",
      "/api/v1/wealth/funds/../users/x",
    ])
      expect(isAllowedSodexPath(p), p).toBe(false);
  });

  it("clients refuse to build or fetch anything outside the list", () => {
    const pub = new SoDEXPublicClient({ rootUrl: ROOT });
    expect(() => pub.url("wealth/users/x/fund-details")).toThrow(/allow-listed/);
    expect(() => pub.url("lottery/treasure/open")).toThrow(/allow-listed/);
    expect(pub.url("lottery/feed")).toBe(`${ROOT}/lottery/feed`);
    const perps = new SoDEXClient({ baseUrl: `${ROOT}/perps` });
    expect(perps.url("markets/ANT-USD/orderbook", { limit: 20 })).toBe(`${ROOT}/perps/markets/ANT-USD/orderbook?limit=20`);
    expect(() => perps.url("orders")).toThrow(/only calls \/markets/);
  });
});

describe("rewards normalisers (real captures)", () => {
  it("combines volume weights, week info and lottery rules; bps → percent", () => {
    const inc = toRewardsIncentives(volumeWeights.parse(weightsFx.data), weekInfo.parse(weekFx.data), lotteryMeta.parse(metaFx.data), P);
    expect(inc.roundId).toBe(13);
    expect(inc.roundStart).toBe(new Date(1795521600000).toISOString());
    expect(inc.roundEnd).toBe(new Date(1796126400000).toISOString());
    expect(inc.multipliers).toHaveLength(10);
    expect(inc.multipliers.find((m) => m.symbol === "ANT-USD")).toEqual({ marketType: "perps", symbol: "ANT-USD", coefficient: 1.2 });
    expect(inc.weekName).toBe("Week 13");
    expect(inc.weekStatus).toBe("LIVE");
    expect(inc.weekPoolPoints).toBe(1_000_000);
    expect(inc.distributionTime).toBe(new Date(1796385600 * 1000).toISOString()); // seconds → ISO
    expect(inc.volumePerBoxUsd).toBe(10_000);
    expect(inc.takerWeightPct).toBe(100);
    expect(inc.makerWeightPct).toBe(20);
    expect(inc.rewardBands[0]).toEqual({ level: "Common", minUsd: 1, maxUsd: 8 });
    expect(inc.rewardBands).toHaveLength(4);
    expect(inc.probabilitiesPublished).toBe(false);
  });

  it("feed: newest first, wallets dropped, filter note explains the survivorship bias", () => {
    const feed = toRewardFeed(lotteryFeed.parse(feedFx.data), P);
    expect(feed.items).toHaveLength(25);
    expect(feed.items.map((i) => i.tsMs)).toEqual([...feed.items.map((i) => i.tsMs)].sort((a, b) => b - a));
    expect(JSON.stringify(feed)).not.toMatch(/0x[0-9a-f]{4}\.\.\.\./i);
    expect(Object.keys(feed.items[0]!).sort()).toEqual(["assetSymbol", "level", "pfp", "rewardUsd", "tsMs"]);
    expect(feed.items.every((i) => i.rewardUsd >= 50 || i.pfp)).toBe(true);
    expect(feed.filterNote).toBe(FEED_FILTER_NOTE);
    expect(feed.filterNote).toMatch(/50/);
    expect(feed.filterNote).toMatch(/5 minutes/);
  });

  it("service: live via rewards envelope (msg/message), demo when the provider errors", async () => {
    const handlers: Array<[string, () => Response]> = [
      ["/sopoints/volume-weights", () => json(strip(weightsFx))],
      ["/sopoints/week/info", () => json(strip(weekFx))],
      ["/lottery/meta", () => json(strip(metaFx))],
      ["/lottery/feed", () => json(strip(feedFx))],
    ];
    const live = new RewardsDataService({ cache: new MarketDataCache(), sodexPublic: new SoDEXPublicClient({ rootUrl: ROOT, fetchImpl: router(handlers) }) });
    const inc = await live.getIncentives();
    expect(inc.provenance).toMatchObject({ kind: "live", provider: "sodex-rewards" });
    expect((await live.getFeed()).provenance.kind).toBe("live");

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const down = new RewardsDataService({
        cache: new MarketDataCache(),
        sodexPublic: new SoDEXPublicClient({ rootUrl: ROOT, fetchImpl: router([["/", () => json({ code: -1, msg: "busy" })]]) }),
      });
      const d = await down.getIncentives();
      expect(d.provenance.kind).toBe("demo");
      expect(d.provenance.fetchedAt).toBe(weightsFx._captured_at);
      expect(d.takerWeightPct).toBe(100);
      expect((await down.getFeed()).provenance.fetchedAt).toBe(feedFx._captured_at);
    } finally {
      warn.mockRestore();
    }
  });
});

describe("perps + vANT order books", () => {
  it("perps meta + book normalisation: id, label, tick/lot, spread, cumulative depth", () => {
    const meta = toPerpsSymbolMeta(spotSymbols.parse(perpsSymbolsFx.data).find((s) => s.name === "ANT-USD")!);
    const snap = toOrderBookSnapshot(meta, orderBook.parse(perpsBookFx.data), P);
    expect(snap.market).toBe("perps:ANT-USD");
    expect(snap.marketType).toBe("perps");
    expect(snap.displayName).toBe("ANT-USD perpetual");
    expect(snap.baseAsset).toBe("ANT");
    expect(snap.tickSize).toBe(0.01);
    expect(snap.lotSize).toBe(0.01);
    expect(snap.bestBid).toBe(86.08);
    expect(snap.bestAsk).toBe(86.09);
    expect(snap.spread).toBeCloseTo(0.01, 10);
    expect(snap.midPrice).toBeCloseTo(86.085, 10);
    expect(snap.bids[2]!.cumulativeQuantity).toBeCloseTo(1.52 + 1.82 + 2.09, 10);
    expect(snap.asks[1]!.cumulativeQuantity).toBeCloseTo(2.89 + 3.09, 10);
    expect(snap.bids).toHaveLength(20);
  });

  it("every captured perps symbol parses", () => {
    expect(spotSymbols.parse(perpsSymbolsFx.data).length).toBe(perpsSymbolsFx.data.length);
  });

  it("OrderBookService.get serves perps:ANT-USD and vANT_vUSDC live, rejects unlisted perps with not_found", async () => {
    const calls: string[] = [];
    const fetchImpl = router(
      [
        ["/perps/markets/symbols", () => json(strip(perpsSymbolsFx))],
        ["/perps/markets/ANT-USD/orderbook", () => json(strip(perpsBookFx))],
        ["/spot/markets/symbols", () => json(strip(antSymbolFx))],
        ["/spot/markets/vANT_vUSDC/orderbook", () => json(strip(antBookFx))],
      ],
      calls,
    );
    const svc = new OrderBookService({
      cache: new MarketDataCache(),
      sodex: new SoDEXClient({ baseUrl: `${ROOT}/spot`, fetchImpl }),
      sodexPerps: new SoDEXClient({ baseUrl: `${ROOT}/perps`, fetchImpl }),
    });
    const perps = await svc.get("perps:ANT-USD", 20);
    expect(perps.provenance.kind).toBe("live");
    expect(perps.provenance.sourceUrl).toBe(`${ROOT}/perps/markets/ANT-USD/orderbook?limit=20`);
    expect(perps.displayName).toBe("ANT-USD perpetual");
    const ant = await svc.get("vANT_vUSDC", 20);
    expect(ant.marketType).toBe("spot");
    expect(ant.displayName).toBe("ANT/USDC");
    expect(ant.lotSize).toBe(0.001);
    await expect(svc.get("perps:NOPE-USD")).rejects.toMatchObject({ code: "not_found" });
    expect(calls.every((u) => isAllowedSodexPath(new URL(u).pathname))).toBe(true);
  });

  it("demo books exist for vANT_vUSDC and perps:ANT-USD", async () => {
    const d = demoOrderBook("perps:ANT-USD", 10)!;
    expect(d.provenance.kind).toBe("demo");
    expect(d.provenance.fetchedAt).toBe(perpsBookFx._captured_at);
    expect(d.bids).toHaveLength(10);
    expect(demoOrderBook("vANT_vUSDC")!.displayName).toBe("ANT/USDC");
    const svc = new OrderBookService({ cache: new MarketDataCache(), sodex: null, sodexPerps: null });
    expect((await svc.get("perps:ANT-USD")).market).toBe("perps:ANT-USD");
  });

  it("route query accepts spot + perps ids and rejects junk", () => {
    expect(orderBookQuerySchema.parse({ market: "perps:ANT-USD" }).market).toBe("perps:ANT-USD");
    expect(orderBookQuerySchema.parse({ market: "vANT_vUSDC", limit: "10" })).toEqual({ market: "vANT_vUSDC", limit: 10 });
    expect(orderBookQuerySchema.parse({}).market).toBe("vBTC_vUSDC");
    expect(() => orderBookQuerySchema.parse({ market: "perps:../x" })).toThrow();
    expect(() => orderBookQuerySchema.parse({ market: "BTC" })).toThrow();
  });
});
