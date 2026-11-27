import { describe, expect, it, vi } from "vitest";
import dcaQqq from "@/lib/market-data/__fixtures__/sodex/wealth-dca-vQQQ.json";
import dcaVoo from "@/lib/market-data/__fixtures__/sodex/wealth-dca-vVOO.json";
import fundAntb from "@/lib/market-data/__fixtures__/sodex/wealth-fund-antb.json";
import fundCxmt from "@/lib/market-data/__fixtures__/sodex/wealth-fund-CXMT.json";
import fundMorpho from "@/lib/market-data/__fixtures__/sodex/wealth-fund-morpho.json";
import fundUnitree from "@/lib/market-data/__fixtures__/sodex/wealth-fund-UNITREE.json";
import fundsFx from "@/lib/market-data/__fixtures__/sodex/wealth-funds.json";
import marketsFx from "@/lib/market-data/__fixtures__/sodex/wealth-markets.json";
import priceAntb from "@/lib/market-data/__fixtures__/sodex/wealth-price-history-antb.json";
import priceQqq1Y from "@/lib/market-data/__fixtures__/sodex/wealth-price-history-vQQQ-1Y.json";
import priceQqq from "@/lib/market-data/__fixtures__/sodex/wealth-price-history-vQQQ.json";
import priceVoo1Y from "@/lib/market-data/__fixtures__/sodex/wealth-price-history-vVOO-1Y.json";
import { MarketDataCache, TTL } from "@/lib/market-data/cache";
import { buildEvidencePack, parseRequirement } from "@/lib/market-data/evidence";
import { wealthDcaQuerySchema, wealthFundParamsSchema, wealthPriceQuerySchema } from "@/lib/market-data/params";
import { RewardsDataService, WealthDataService } from "@/lib/market-data/services";
import { SoDEXPublicClient } from "@/lib/market-data/sodex/public-client";
import {
  dcaFromPrices,
  feeRateToPct,
  simulateWeeklyDca,
  toDcaSimulation,
  toMarketStatus,
  toWealthFund,
  toWealthPriceSeries,
  toWealthQuote,
} from "@/lib/market-data/sodex/wealth-normalise";
import { wealthDcaHistory, wealthFundDetail, wealthFundList, wealthMarkets, wealthPriceHistory } from "@/lib/market-data/sodex/wealth-schemas";
import { demoDca, demoPriceHistory, demoWealthBoard } from "@/lib/market-data/wealth-fixtures";
import { ApiError } from "@/lib/server/api";
import type { DataProvenance } from "@/lib/types";

const ROOT = "https://mainnet-gw.sodex.dev/api/v1";
const P: DataProvenance = { kind: "demo", provider: "fixture", sourceUrl: "x", fetchedAt: "2026-11-27T09:50:00.000Z" };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
function strip(fx: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fx).filter(([k]) => !k.startsWith("_")));
}
/** first matching needle wins; order needles most-specific first */
function router(handlers: Array<[string, () => Response | Promise<Response>]>, calls?: string[]): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    calls?.push(url);
    for (const [needle, h] of handlers) if (url.includes(needle)) return h();
    return json({ code: -1, timestamp: 1, error: "not found" });
  }) as typeof fetch;
}
const liveHandlers = (): Array<[string, () => Response]> => [
  ["/wealth/funds/vQQQ/dca-history", () => json(strip(dcaQqq))],
  ["/wealth/funds/vQQQ/price-history?interval=1d&range=1Y", () => json(strip(priceQqq1Y))],
  ["/wealth/funds/vQQQ/price-history", () => json(strip(priceQqq))],
  ["/wealth/funds/CXMT", () => json(strip(fundCxmt))],
  ["/wealth/funds/UNITREE", () => json(strip(fundUnitree))],
  ["/wealth/funds/antb", () => json(strip(fundAntb))],
  ["/wealth/funds/vQQQ", () => json({ code: 0, timestamp: 1, data: { ...fundsFx.data[5], contracts: {}, chainConfig: null } })],
  ["/wealth/funds", () => json(strip(fundsFx))],
  ["/wealth/markets", () => json(strip(marketsFx))],
];
function service(fetchImpl: typeof fetch, now = () => Date.parse("2026-11-27T10:00:00Z"), cache = new MarketDataCache()) {
  return new WealthDataService({ cache, sodexPublic: new SoDEXPublicClient({ rootUrl: ROOT, fetchImpl }), now });
}

describe("wealth schemas + normalisers (real captures)", () => {
  it("funds list: kind labels, nav/aum numbers, clob spot symbol, no fees from the list", () => {
    const funds = wealthFundList.parse(fundsFx.data).map((f) => toWealthFund(f, P));
    expect(funds).toHaveLength(12);
    const byId = Object.fromEntries(funds.map((f) => [f.fundId, f]));
    expect(byId.antb!.kindLabel).toBe("Index");
    expect(byId.antb!.fundType).toBe("ssi-v2");
    expect(byId.CXMT!.kindLabel).toBe("Fund vault");
    expect(byId.CXMT!.aum).toBeCloseTo(18066.980495, 6);
    expect(byId["Morpho-Earn"]!.kindLabel).toBe("Yield vault");
    expect(byId.vQQQ!.kindLabel).toBe("Tokenised ETF");
    expect(byId.vQQQ!.nav).toBeNull();
    expect(byId.vQQQ!.spotSymbol).toBe("vQQQ_vUSDC");
    expect(byId.antb!.shareSymbol).toBe("ANTB.ssi");
    expect(funds.every((f) => f.managementFeePct === null)).toBe(true);
    expect(byId.antb!.asOf).toBe("2026-11-27T09:49:58.000Z");
  });

  it("fund detail fees: raw 1e18 → percent; empty string → null; chainConfig null → null", () => {
    expect(feeRateToPct("36500000000000000")).toBeCloseTo(3.65, 10);
    expect(feeRateToPct("0")).toBe(0);
    expect(feeRateToPct("")).toBeNull();
    const unitree = toWealthFund(wealthFundDetail.parse(fundUnitree.data), P);
    expect(unitree.managementFeePct).toBeCloseTo(3.65, 10);
    expect(unitree.performanceFeePct).toBe(0);
    const cxmt = toWealthFund(wealthFundDetail.parse(fundCxmt.data), P);
    expect(cxmt.managementFeePct).toBe(0);
    expect(cxmt.nav).toBeCloseTo(4.937955756657, 10);
    const antb = toWealthFund(wealthFundDetail.parse(fundAntb.data), P);
    expect(antb.managementFeePct).toBeNull();
    expect(antb.performanceFeePct).toBeNull();
    const morpho = toWealthFund(wealthFundDetail.parse(fundMorpho.data), P);
    expect(morpho.managementFeePct).toBeNull();
    expect(morpho.fundId).toBe("Morpho-Earn");
  });

  it("market board: percent values pass through unchanged; statuses mapped; fundType from fund list when missing", () => {
    const rows = wealthMarkets.parse(marketsFx.data).quotes;
    const types = new Map(wealthFundList.parse(fundsFx.data).map((f) => [f.fundId, toWealthFund(f, P).fundType]));
    const quotes = Object.fromEntries(rows.map((r) => [r.fundId, toWealthQuote(r, types.get(r.fundId), P)]));
    expect(quotes.antb!.changePct).toBe(2.43446735); // "2.43446735" = +2.43 %, NOT ×100
    expect(quotes.vQQQ!.roi1YPct).toBe(5.77032081);
    expect(quotes.vQQQ!.dividendYieldPct).toBe(0.45);
    expect(quotes["Morpho-Earn"]!.apy7dPct).toBe(4.45081316);
    expect(quotes["Morpho-Earn"]!.apy1MPct).toBe(5.24863701);
    expect(quotes.vQQQ!.marketStatus).toBe("pre-market");
    expect(quotes.CXMT!.marketStatus).toBe("closed");
    expect(quotes.CXMT!.fundType).toBe("escrow_vault");
    expect(quotes.antb!.marketStatus).toBe("always-open");
    expect(quotes["Morpho-Earn"]!.marketStatus).toBe("always-open");
    expect(quotes.vQQQ!.priceStatus).toBe("ready");
    expect(quotes.vQQQ!.dayVolume).toBeCloseTo(81996734.464435, 4);
    expect(quotes.antb!.roi1YPct).toBeNull();
  });

  it("market status mapping covers every provider string", () => {
    expect(toMarketStatus("OPEN", "clob")).toBe("open");
    expect(toMarketStatus("AFTER_HOURS", "clob")).toBe("after-hours");
    expect(toMarketStatus("PRE_MARKET", "clob")).toBe("pre-market");
    expect(toMarketStatus("CLOSED", "escrow_vault")).toBe("closed");
    expect(toMarketStatus("SOMETHING_NEW", "clob")).toBe("unknown");
    expect(toMarketStatus(undefined, "clob")).toBe("unknown");
    expect(toMarketStatus(undefined, "escrow_vault")).toBe("unknown");
    expect(toMarketStatus(undefined, "ssi-v2")).toBe("always-open");
    expect(toMarketStatus(null, "bridged_vault")).toBe("always-open");
  });

  it("price history: numbers, ascending, ranges", () => {
    for (const fx of [priceAntb, priceQqq, priceQqq1Y, priceVoo1Y]) {
      const s = toWealthPriceSeries(wealthPriceHistory.parse(fx.data), "1M", P);
      expect(s.points.length).toBe(fx.data.points.length);
      const ts = s.points.map((p) => Date.parse(p.ts));
      expect(ts).toEqual([...ts].sort((a, b) => a - b));
      expect(s.interval).toBe("1d");
    }
    const antb = toWealthPriceSeries(wealthPriceHistory.parse(priceAntb.data), "1M", P);
    expect(antb.points[0]).toEqual({ ts: "2026-11-22T00:00:00.000Z", close: 9.3774362479629504 });
    expect(antb.range).toBe("1M");
    expect(antb.symbol).toBe("ANTB.ssi");
    // descending input is re-sorted
    const rev = toWealthPriceSeries({ ...wealthPriceHistory.parse(priceAntb.data), points: [...priceAntb.data.points].reverse() }, "1M", P);
    expect(rev.points).toEqual(antb.points);
  });

  it("DCA: returnRate FRACTION → percent (×100)", () => {
    const sim = toDcaSimulation(wealthDcaHistory.parse(dcaQqq.data), "1Y", P);
    expect(sim.totalReturnPct).toBeCloseTo(-2.0870739439541544, 8);
    expect(sim.points[1]).toEqual({ tradeDate: "2025-12-08", returnPct: expect.closeTo(0.5760163326, 8) });
    expect(sim.ready).toBe(true);
    const voo = toDcaSimulation(wealthDcaHistory.parse(dcaVoo.data), "1Y", P);
    expect(voo.totalReturnPct).toBeCloseTo(0.5776154789670949, 8);
    const notReady = toDcaSimulation(wealthDcaHistory.parse({ fundId: "antb", range: "1Y", returnRate: "", points: [], ready: false }), "1Y", P);
    expect(notReady).toMatchObject({ ready: false, totalReturnPct: null, points: [] });
  });

  it("weekly DCA simulation reproduces SoDEX's own 1Y curve from the 1Y closes", () => {
    const qqq = toWealthPriceSeries(wealthPriceHistory.parse(priceQqq1Y.data), "1Y", P);
    const pts = simulateWeeklyDca(qqq.points, "1Y");
    const sodex = toDcaSimulation(wealthDcaHistory.parse(dcaQqq.data), "1Y", P);
    // the dca capture is trimmed to its first 25 weeks; those weeks must match exactly
    for (const p of sodex.points) {
      const mine = pts.find((x) => x.tradeDate === p.tradeDate);
      expect(mine, p.tradeDate).toBeDefined();
      expect(mine!.returnPct).toBeCloseTo(p.returnPct, 6);
    }
    expect(pts[pts.length - 1]!.returnPct).toBeCloseTo(sodex.totalReturnPct!, 4);
    const three = dcaFromPrices("vQQQ", qqq.points, "3M", P);
    expect(three.points.length).toBeGreaterThanOrEqual(12);
    expect(three.points.length).toBeLessThanOrEqual(14);
    expect(three.points[0]!.returnPct).toBe(0);
    expect(three.range).toBe("3M");
  });
});

describe("demo wealth fixtures", () => {
  it("board is demo, captured time, fees from detail captures", () => {
    const b = demoWealthBoard();
    expect(b.funds).toHaveLength(12);
    expect(b.quotes).toHaveLength(12);
    expect(b.funds.every((f) => f.provenance.kind === "demo")).toBe(true);
    expect(b.funds.find((f) => f.fundId === "UNITREE")!.managementFeePct).toBeCloseTo(3.65, 8);
    expect(b.quotes[0]!.provenance.fetchedAt).toBe(marketsFx._captured_at);
  });
  it("price + dca demo coverage", () => {
    expect(demoPriceHistory("vVOO", "1W")!.points.length).toBeLessThanOrEqual(6);
    expect(demoPriceHistory("antb", "1M")!.points.length).toBe(6);
    expect(demoPriceHistory("CXMT", "1M")).toBeNull();
    expect(demoDca("vVOO", "6M")!.provenance.kind).toBe("demo");
    expect(demoDca("CXMT", "1Y")).toBeNull();
  });
});

describe("WealthDataService", () => {
  it("live board: funds + quotes, escrow fees filled from fund detail, provider sodex-wealth", async () => {
    const calls: string[] = [];
    const svc = service(router(liveHandlers(), calls));
    const b = await svc.getBoard();
    expect(b.funds[0]!.provenance).toMatchObject({ kind: "live", provider: "sodex-wealth" });
    expect(b.funds.find((f) => f.fundId === "UNITREE")!.managementFeePct).toBeCloseTo(3.65, 8);
    expect(b.funds.find((f) => f.fundId === "CXMT")!.managementFeePct).toBe(0);
    expect(b.quotes.find((q) => q.fundId === "vQQQ")!.changePct).toBe(1.8203024);
    // only escrow vaults' detail is fetched
    expect(calls.filter((u) => /\/wealth\/funds\/[^/?]+$/.test(u)).map((u) => u.split("/").pop()).sort()).toEqual(["CXMT", "UNITREE"]);
  });

  it("getFund: detail + quote; unknown fund → not_found without calling SoDEX", async () => {
    const calls: string[] = [];
    const svc = service(router(liveHandlers(), calls));
    const f = await svc.getFund("antb");
    expect(f.kindLabel).toBe("Index");
    expect(f.quote!.marketStatus).toBe("always-open");
    calls.length = 0;
    await expect(svc.getFund("nope")).rejects.toMatchObject({ code: "not_found" });
    await expect(svc.getFund("../users")).rejects.toBeInstanceOf(ApiError);
    expect(calls.some((u) => u.includes("nope") || u.includes("users"))).toBe(false);
  });

  it("DCA 1Y uses SoDEX dca-history; 3M/6M are computed from 1Y closes with a note", async () => {
    const calls: string[] = [];
    const svc = service(router(liveHandlers(), calls));
    const y = await svc.getDca("vQQQ", "1Y");
    expect(y.totalReturnPct).toBeCloseTo(-2.087, 3);
    expect(y.provenance.kind).toBe("live");
    const six = await svc.getDca("vQQQ", "6M");
    expect(six.range).toBe("6M");
    expect(six.provenance.note).toMatch(/computed by MarketGym/i);
    expect(calls.some((u) => /dca-history\?range=(3M|6M)/.test(u))).toBe(false);
  });

  it("live → cached (stale after failure, with note) → demo", async () => {
    let t = Date.parse("2026-11-27T10:00:00Z");
    const now = () => t;
    const cache = new MarketDataCache();
    let mode: "ok" | "timeout" | "code" | "malformed" = "ok";
    const fetchImpl = (async (input: string | URL | Request) => {
      const url = String(input);
      if (mode === "timeout") {
        const e = new Error("aborted");
        e.name = "AbortError";
        throw e;
      }
      if (mode === "code") return json({ code: -1, timestamp: 1, error: "internal" });
      if (mode === "malformed") return json({ code: 0, timestamp: 1, data: { points: "nope" } });
      return router(liveHandlers())(url);
    }) as typeof fetch;
    const svc = service(fetchImpl, now, cache);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect((await svc.getPriceHistory("vQQQ", "3M")).provenance.kind).toBe("live");
      t += TTL.wealthPrice + 1;
      for (const m of ["timeout", "code", "malformed"] as const) {
        mode = m;
        const stale = await svc.getPriceHistory("vQQQ", "3M");
        expect(stale.provenance.kind).toBe("cached");
        expect(stale.provenance.note).toMatch(/Provider failed/);
        t += TTL.wealthPrice + 1;
      }
      // fresh cache, provider down → demo board + demo series
      mode = "code";
      const cold = service(fetchImpl, now, new MarketDataCache());
      const s = await cold.getPriceHistory("vQQQ", "3M");
      expect(s.provenance.kind).toBe("demo");
      expect(s.provenance.note).toMatch(/SoDEX Wealth unavailable/);
      expect(s.provenance.fetchedAt).toBe(priceQqq1Y._captured_at);
      const board = await cold.getBoard();
      expect(board.funds[0]!.provenance.kind).toBe("demo");
    } finally {
      warn.mockRestore();
    }
  });

  it("demo mode (no client) serves fixtures", async () => {
    const svc = new WealthDataService({ cache: new MarketDataCache(), sodexPublic: null });
    expect((await svc.getBoard()).funds[0]!.provenance.note).toMatch(/DEMO_MODE/);
    expect((await svc.getDca("vVOO", "1Y")).provenance.kind).toBe("demo");
    await expect(svc.getDca("CXMT", "1Y")).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("route params", () => {
  it("validates fund ids and ranges", () => {
    expect(wealthFundParamsSchema.parse({ fundId: "Morpho-Earn" }).fundId).toBe("Morpho-Earn");
    expect(() => wealthFundParamsSchema.parse({ fundId: "../x" })).toThrow();
    expect(wealthPriceQuerySchema.parse({}).range).toBe("1M");
    expect(() => wealthPriceQuerySchema.parse({ range: "5Y" })).toThrow();
    expect(wealthDcaQuerySchema.parse({ range: "6M" }).range).toBe("6M");
    expect(() => wealthDcaQuerySchema.parse({ range: "1W" })).toThrow();
  });
});

describe("evidence tokens (wealth + rewards)", () => {
  it("parses the new tokens", () => {
    expect(parseRequirement("orderbook:perps:ANT-USD")).toEqual({ kind: "orderbook", arg: "perps:ANT-USD" });
    expect(parseRequirement("orderbook:vANT_vUSDC")).toEqual({ kind: "orderbook", arg: "vANT_vUSDC" });
    expect(parseRequirement("wealth:board")).toEqual({ kind: "wealth-board", arg: "board" });
    expect(parseRequirement("wealth:fund:antb")).toEqual({ kind: "wealth-fund", arg: "antb" });
    expect(parseRequirement("wealth:price:vQQQ:3M")).toEqual({ kind: "wealth-price", arg: "vQQQ", range: "3M" });
    expect(parseRequirement("wealth:dca:vVOO:1Y")).toEqual({ kind: "wealth-dca", arg: "vVOO", range: "1Y" });
    expect(parseRequirement("wealth:dca:vVOO:1W")).toBeNull();
    expect(parseRequirement("rewards:incentives")).toEqual({ kind: "rewards", arg: "incentives" });
    expect(parseRequirement("rewards:claim")).toBeNull();
  });

  it("fills the optional pack fields; unknown funds are skipped with a warning, never thrown", async () => {
    const cache = new MarketDataCache();
    const wealth = new WealthDataService({ cache, sodexPublic: null });
    const rewards = new RewardsDataService({ cache, sodexPublic: null });
    const stub = { snapshots: {}, news: {}, etf: {}, indexes: {}, orderBooks: {} } as never as Parameters<typeof buildEvidencePack>[1];
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const pack = await buildEvidencePack(
        ["wealth:fund:antb", "wealth:fund:ghost", "wealth:price:vQQQ:3M", "wealth:dca:vVOO:1Y", "wealth:dca:ghost:1Y", "rewards:incentives", "rewards:feed"],
        { ...(stub as object), wealth, rewards } as Parameters<typeof buildEvidencePack>[1],
      );
      expect(pack.wealthFunds!.map((f) => f.fundId)).toEqual(["antb"]);
      expect(pack.wealthQuotes!.map((q) => q.fundId)).toEqual(["antb"]);
      expect(pack.wealthPrices![0]!.fundId).toBe("vQQQ");
      expect(pack.dcaSimulations!.map((d) => d.fundId)).toEqual(["vVOO"]);
      expect(pack.rewardIncentives!.takerWeightPct).toBe(100);
      expect(pack.rewardFeed!.items.length).toBeGreaterThan(0);
      expect(warn.mock.calls.some((c) => String(c[0]).includes("wealth:fund:ghost"))).toBe(true);

      const board = await buildEvidencePack(["wealth:board"], { ...(stub as object), wealth, rewards } as Parameters<typeof buildEvidencePack>[1]);
      expect(board.wealthFunds).toHaveLength(12);
      expect(board.wealthQuotes).toHaveLength(12);
      expect(board.rewardFeed).toBeUndefined();
    } finally {
      warn.mockRestore();
    }
  });
});
