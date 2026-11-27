/**
 * Wave 2 test fixtures: the real SoDEX Wealth / Rewards / ANT captures
 * normalised into lib/types/wealth.ts shapes (percent units, numbers), plus
 * the ANT spot and ANT-USD perpetual books. A local normaliser keeps these
 * tests independent of lib/market-data, which another agent owns.
 */
import type { EvidencePack, OrderBookSnapshot, DataProvenance } from "@/lib/types/market";
import type { DcaSimulation, PaperPortfolio, RewardFeed, RewardsIncentives, WealthFund, WealthFundType, WealthMarketStatus, WealthQuote } from "@/lib/types/wealth";
import fundsRaw from "@/lib/market-data/__fixtures__/sodex/wealth-funds.json";
import marketsRaw from "@/lib/market-data/__fixtures__/sodex/wealth-markets.json";
import cxmtRaw from "@/lib/market-data/__fixtures__/sodex/wealth-fund-CXMT.json";
import dcaVooRaw from "@/lib/market-data/__fixtures__/sodex/wealth-dca-vVOO.json";
import dcaQqqRaw from "@/lib/market-data/__fixtures__/sodex/wealth-dca-vQQQ.json";
import weightsRaw from "@/lib/market-data/__fixtures__/sodex/rewards-volume-weights.json";
import weekRaw from "@/lib/market-data/__fixtures__/sodex/rewards-week-info.json";
import metaRaw from "@/lib/market-data/__fixtures__/sodex/rewards-lottery-meta.json";
import feedRaw from "@/lib/market-data/__fixtures__/sodex/rewards-lottery-feed.json";
import antSpotRaw from "@/lib/market-data/__fixtures__/sodex/mainnet-spot-orderbook-vANT_vUSDC.json";
import antPerpRaw from "@/lib/market-data/__fixtures__/sodex/mainnet-perps-orderbook-ANT-USD.json";
import { NOW, bookFromFixture } from "./fixtures";

const CAPTURED = "2026-11-27T09:50:40.000Z";

export function prov(provider: DataProvenance["provider"], asOf?: string): DataProvenance {
  return { kind: "demo", provider, sourceUrl: `fixture://${provider}`, fetchedAt: CAPTURED, ...(asOf ? { asOf } : {}) };
}

const num = (v: unknown): number | null => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const KIND: Record<string, string> = { clob: "Tokenised ETF", "ssi-v2": "Index", bridged_vault: "Yield vault", escrow_vault: "Fund vault" };

function fundType(t: unknown): WealthFundType {
  return t === "clob" || t === "escrow_vault" || t === "bridged_vault" || t === "ssi-v2" ? t : "other";
}

interface RawFund { fundId: string; name: string; fundType: string; fundStatus: string; nav?: string; aum?: string; asOf: string; share: { coin: string }; spot?: { symbol: string } }

const cxmtDetail = (cxmtRaw as { data: { chainConfig: { mgmtFeeRate: string; perfFeeRate: string } } }).data.chainConfig;

export const wealthFunds: WealthFund[] = (fundsRaw as { data: RawFund[] }).data.map((f) => ({
  fundId: f.fundId,
  name: f.name,
  fundType: fundType(f.fundType),
  kindLabel: KIND[f.fundType] ?? "Fund",
  fundStatus: f.fundStatus === "live" || f.fundStatus === "subscription" ? f.fundStatus : "other",
  shareSymbol: f.share.coin,
  nav: num(f.nav),
  aum: num(f.aum),
  spotSymbol: f.spot?.symbol ?? null,
  // only CXMT's detail publishes fee rates in the captures ("0"); others are unknown
  managementFeePct: f.fundId === "CXMT" ? Number(cxmtDetail.mgmtFeeRate) : null,
  performanceFeePct: f.fundId === "CXMT" ? Number(cxmtDetail.perfFeeRate) : null,
  asOf: f.asOf,
  provenance: prov("sodex-wealth", f.asOf),
}));

const STATUS: Record<string, WealthMarketStatus> = { OPEN: "open", PRE_MARKET: "pre-market", AFTER_HOURS: "after-hours", CLOSED: "closed" };

type RawQuote = Record<string, string | undefined> & { fundId: string };
export const wealthQuotes: WealthQuote[] = (marketsRaw as { data: { quotes: RawQuote[] } }).data.quotes.map((q) => {
  const fund = wealthFunds.find((f) => f.fundId === q.fundId);
  const t = fund?.fundType ?? fundType(q.fundType);
  return {
    fundId: q.fundId,
    symbol: q.symbol ?? null,
    fundType: t,
    price: Number(q.price),
    prevClose: num(q.prevClose),
    changePct: num(q.changePct),
    roi24hPct: num(q.roi24h),
    roi1MPct: num(q.roi1M),
    roi1YPct: num(q.roi1Y),
    roi3YPct: num(q.roi3Y),
    roiYtdPct: num(q.roiYtd),
    dividendYieldPct: num(q.dividendYield),
    apy7dPct: num(q.apy7d),
    apy1MPct: num(q.apy1M),
    dayVolume: num(q.dayVolume),
    marketStatus: q.marketStatus ? STATUS[q.marketStatus] ?? "unknown" : t === "ssi-v2" || t === "bridged_vault" ? "always-open" : "unknown",
    priceStatus: q.priceStatus === "ready" || q.priceStatus === "stale" || q.priceStatus === "unavailable" ? q.priceStatus : "unknown",
    priceSource: q.priceSource ?? null,
    asOf: q.asOf ?? null,
    provenance: prov("sodex-wealth", q.asOf),
  };
});

interface RawDca { data: { fundId: string; range: string; returnRate: string; points: Array<{ tradeDate: string; returnRate: string }> } }
function dca(raw: RawDca): DcaSimulation {
  return {
    fundId: raw.data.fundId,
    range: "1Y",
    totalReturnPct: Number(raw.data.returnRate) * 100, // fraction -> percent
    points: raw.data.points.map((p) => ({ tradeDate: p.tradeDate, returnPct: Number(p.returnRate) * 100 })),
    ready: true,
    provenance: prov("sodex-wealth"),
  };
}
export const dcaVoo = dca(dcaVooRaw as RawDca);
export const dcaQqq = dca(dcaQqqRaw as RawDca);

const w = (weightsRaw as { data: { round: { round_id: number; start_ts_ms: number; end_ts_ms: number }; weights: Array<{ market_type: string; symbol: string; coefficient: string }> } }).data;
const wk = (weekRaw as { data: { weekName: string; weekStatus: string; weekPoolPoints: number; distributionTime: number } }).data;
const rules = (metaRaw as { data: { rules: { volumePerBoxU: number; takerWeightBps: number; makerWeightBps: number; rewardBands: Array<{ level: string; minUsd: string; maxUsd: string }> } } }).data.rules;

export const rewardIncentives: RewardsIncentives = {
  roundId: w.round.round_id,
  roundStart: new Date(w.round.start_ts_ms).toISOString(),
  roundEnd: new Date(w.round.end_ts_ms).toISOString(),
  multipliers: w.weights.map((x) => ({ marketType: x.market_type === "spot" ? "spot" : "perps", symbol: x.symbol, coefficient: Number(x.coefficient) })),
  weekName: wk.weekName,
  weekStatus: wk.weekStatus,
  weekPoolPoints: wk.weekPoolPoints,
  distributionTime: new Date(wk.distributionTime * 1000).toISOString(),
  volumePerBoxUsd: rules.volumePerBoxU,
  takerWeightPct: rules.takerWeightBps / 100,
  makerWeightPct: rules.makerWeightBps / 100,
  rewardBands: rules.rewardBands.map((b) => ({ level: b.level, minUsd: Number(b.minUsd), maxUsd: Number(b.maxUsd) })),
  probabilitiesPublished: false,
  provenance: prov("sodex-rewards"),
};

export const rewardFeed: RewardFeed = {
  items: (feedRaw as { data: { items: Array<{ tsMs: number; level: string; rewardUsd: string; reward: { asset: { symbol: string } }; pfp?: boolean }> } }).data.items.map((i) => ({
    tsMs: i.tsMs,
    level: i.level,
    rewardUsd: Number(i.rewardUsd),
    assetSymbol: i.reward.asset.symbol,
    pfp: Boolean(i.pfp),
  })),
  filterNote: "Only opens with a reward of at least 50 USD or a PFP drop, delayed 5 minutes.",
  provenance: prov("sodex-rewards"),
};

type RawBook = Parameters<typeof bookFromFixture>[0];
export const antSpotBook: OrderBookSnapshot = bookFromFixture(antSpotRaw as RawBook, { market: "vANT_vUSDC", displayName: "ANT/USDC", base: "vANT", tickSize: 0.01, lotSize: 0.001 });
export const antPerpBook: OrderBookSnapshot = {
  ...bookFromFixture(antPerpRaw as RawBook, { market: "perps:ANT-USD", displayName: "ANT-USD perpetual", base: "ANT", tickSize: 0.01, lotSize: 0.01 }),
  marketType: "perps",
};

export function makeWealthPack(overrides: Partial<EvidencePack> = {}): EvidencePack {
  return {
    id: "wealth-pack-1",
    createdAt: NOW.toISOString(),
    snapshots: [],
    news: [],
    etfFlows: [],
    indexes: [],
    orderBooks: [],
    wealthFunds,
    wealthQuotes,
    dcaSimulations: [dcaVoo, dcaQqq],
    ...overrides,
  };
}

export function makePortfolio(holdings: Array<[string, number]>, overrides: Partial<PaperPortfolio> = {}): PaperPortfolio {
  return {
    id: "pf-1",
    userId: "user-1",
    name: "Practice one",
    holdings: holdings.map(([fundId, weightPct]) => ({ fundId, weightPct })),
    strategy: "weekly-dca",
    rationale: "fixture rationale that is long enough to pass validation rules.",
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}
