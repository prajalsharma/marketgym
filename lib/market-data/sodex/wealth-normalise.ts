/**
 * SoDEX Wealth / Rewards raw payloads → frozen lib/types/wealth.ts shapes. Pure.
 *
 * UNITS (lib/types/wealth.ts):
 *  - /markets changePct, roi*, apy*, dividendYield: already PERCENT → unchanged
 *  - /dca-history returnRate: FRACTION → ×100
 *  - fund detail chainConfig mgmtFeeRate / perfFeeRate: raw 1e18 decimal fraction → ÷1e16 = percent
 *  - rules takerWeightBps / makerWeightBps: basis points → ÷100 = percent
 */
import type { DataProvenance } from "@/lib/types";
import type {
  DcaPoint,
  DcaSimulation,
  PointsMultiplier,
  PricePoint,
  RewardFeed,
  RewardFeedItem,
  RewardsIncentives,
  WealthFund,
  WealthFundType,
  WealthMarketStatus,
  WealthPriceSeries,
  WealthQuote,
} from "@/lib/types/wealth";
import type {
  LotteryFeedRaw,
  LotteryMetaRaw,
  VolumeWeightsRaw,
  WealthDcaHistoryRaw,
  WealthFundDetailRaw,
  WealthFundRaw,
  WealthPriceHistoryRaw,
  WealthQuoteRaw,
  WeekInfoRaw,
} from "./wealth-schemas";

export type PriceRange = "1W" | "1M" | "3M" | "1Y";
export type DcaRange = "3M" | "6M" | "1Y";
export const PRICE_RANGES: readonly PriceRange[] = ["1W", "1M", "3M", "1Y"];
export const DCA_RANGES: readonly DcaRange[] = ["3M", "6M", "1Y"];

export const FEED_FILTER_NOTE =
  "SoDEX's public feed only lists treasure-box opens worth at least USD 50, or ones that dropped a PFP, and it runs about 5 minutes behind. It is a highlight reel of the biggest wins, not a typical result.";

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** decimal string | number → finite number; "" / missing / garbage → null */
export function num(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** raw 1e18 fixed-point fraction ("36500000000000000" = 0.0365) → percent (3.65) */
export function feeRateToPct(v: string | number | null | undefined): number | null {
  const n = num(v);
  return n === null ? null : round(n / 1e16, 8);
}

/** fraction ("-0.0209") → percent (-2.09) */
export function fractionToPct(v: string | number | null | undefined): number | null {
  const n = num(v);
  return n === null ? null : round(n * 100, 8);
}

export function toFundType(s: string | null | undefined): WealthFundType {
  switch (s) {
    case "escrow_vault":
    case "clob":
    case "bridged_vault":
    case "ssi-v2":
      return s;
    default:
      return "other";
  }
}

export function kindLabel(t: WealthFundType): string {
  switch (t) {
    case "clob":
      return "Tokenised ETF";
    case "ssi-v2":
      return "Index";
    case "bridged_vault":
      return "Yield vault";
    case "escrow_vault":
      return "Fund vault";
    default:
      return "Fund";
  }
}

function toFundStatus(s: string): WealthFund["fundStatus"] {
  return s === "subscription" || s === "live" ? s : "other";
}

function iso(s: string | null | undefined, fallback: string): string {
  if (!s) return fallback;
  const t = Date.parse(s);
  return Number.isNaN(t) ? fallback : new Date(t).toISOString();
}

/** list item or detail → WealthFund. Fees only come from a detail's chainConfig. */
export function toWealthFund(raw: WealthFundRaw | WealthFundDetailRaw, provenance: DataProvenance): WealthFund {
  const fundType = toFundType(raw.fundType);
  const chain = "chainConfig" in raw ? raw.chainConfig : null;
  return {
    fundId: raw.fundId,
    name: raw.name,
    fundType,
    kindLabel: kindLabel(fundType),
    fundStatus: toFundStatus(raw.fundStatus),
    shareSymbol: raw.share?.coin ?? raw.fundId,
    nav: num(raw.nav),
    aum: num(raw.aum),
    spotSymbol: raw.spot?.symbol ?? null,
    managementFeePct: chain ? feeRateToPct(chain.mgmtFeeRate) : null,
    performanceFeePct: chain ? feeRateToPct(chain.perfFeeRate) : null,
    asOf: iso(raw.asOf, provenance.fetchedAt),
    provenance,
  };
}

const ALWAYS_OPEN_TYPES: ReadonlySet<WealthFundType> = new Set(["ssi-v2", "bridged_vault"]);

/** provider session string → union. No status: 24/7 only for index/bridged funds. */
export function toMarketStatus(raw: string | null | undefined, fundType: WealthFundType): WealthMarketStatus {
  if (!raw) return ALWAYS_OPEN_TYPES.has(fundType) ? "always-open" : "unknown";
  const s = raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
  switch (s) {
    case "OPEN":
    case "REGULAR":
    case "TRADING":
    case "MARKET_OPEN":
      return "open";
    case "PRE_MARKET":
    case "PREMARKET":
    case "PRE":
      return "pre-market";
    case "AFTER_HOURS":
    case "AFTERHOURS":
    case "POST_MARKET":
    case "POSTMARKET":
    case "POST":
      return "after-hours";
    case "CLOSED":
    case "CLOSE":
    case "HOLIDAY":
    case "HALTED":
      return "closed";
    case "ALWAYS_OPEN":
    case "24/7":
    case "24_7":
      return "always-open";
    default:
      return "unknown";
  }
}

function toPriceStatus(s: string | null | undefined): WealthQuote["priceStatus"] {
  return s === "ready" || s === "stale" || s === "unavailable" ? s : "unknown";
}

/** /markets row → WealthQuote. Percent fields are passed through unchanged. */
export function toWealthQuote(raw: WealthQuoteRaw, fundTypeFallback: WealthFundType | undefined, provenance: DataProvenance): WealthQuote {
  const fundType = raw.fundType ? toFundType(raw.fundType) : (fundTypeFallback ?? "other");
  return {
    fundId: raw.fundId,
    symbol: raw.symbol ?? null,
    fundType,
    price: num(raw.price) ?? 0,
    prevClose: num(raw.prevClose),
    changePct: num(raw.changePct),
    roi24hPct: num(raw.roi24h),
    roi1MPct: num(raw.roi1M),
    roi1YPct: num(raw.roi1Y),
    roi3YPct: num(raw.roi3Y),
    roiYtdPct: num(raw.roiYtd),
    dividendYieldPct: num(raw.dividendYield),
    apy7dPct: num(raw.apy7d),
    apy1MPct: num(raw.apy1M),
    dayVolume: num(raw.dayVolume),
    marketStatus: toMarketStatus(raw.marketStatus, fundType),
    priceStatus: toPriceStatus(raw.priceStatus),
    priceSource: raw.priceSource ?? null,
    asOf: raw.asOf ? iso(raw.asOf, provenance.fetchedAt) : null,
    provenance,
  };
}

const INTERVALS: ReadonlySet<string> = new Set(["1m", "5m", "15m", "1h", "4h", "1d"]);
const SERIES_RANGES: ReadonlySet<string> = new Set(["1D", "1W", "1M", "3M", "1Y", "All"]);

function toPoints(raw: WealthPriceHistoryRaw["points"]): PricePoint[] {
  return raw
    .map((p) => ({ t: Date.parse(p.ts), close: num(p.close) }))
    .filter((p): p is { t: number; close: number } => !Number.isNaN(p.t) && p.close !== null && p.close > 0)
    .sort((a, b) => a.t - b.t)
    .map((p) => ({ ts: new Date(p.t).toISOString(), close: p.close }));
}

export function toWealthPriceSeries(raw: WealthPriceHistoryRaw, requested: PriceRange, provenance: DataProvenance): WealthPriceSeries {
  const r = raw.range.toUpperCase() === "ALL" ? "All" : raw.range.toUpperCase();
  return {
    fundId: raw.fundId,
    symbol: raw.symbol ?? null,
    interval: (INTERVALS.has(raw.interval) ? raw.interval : "1d") as WealthPriceSeries["interval"],
    range: (SERIES_RANGES.has(r) ? r : requested) as WealthPriceSeries["range"],
    points: toPoints(raw.points),
    provenance,
  };
}

function rangeStart(anchorMs: number, range: PriceRange | DcaRange): number {
  const d = new Date(anchorMs);
  if (range === "1W") return anchorMs - 7 * 86_400_000;
  const months = range === "1M" ? 1 : range === "3M" ? 3 : range === "6M" ? 6 : 12;
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.getTime();
}

/** Keep the points within `range` of the newest point (used to cut a 1Y series down). */
export function sliceSeries(points: PricePoint[], range: PriceRange): PricePoint[] {
  if (points.length === 0) return [];
  const last = Date.parse(points[points.length - 1]!.ts);
  const start = rangeStart(last, range);
  return points.filter((p) => Date.parse(p.ts) >= start);
}

/** /dca-history → DcaSimulation (returnRate FRACTION → percent). */
export function toDcaSimulation(raw: WealthDcaHistoryRaw, range: DcaRange, provenance: DataProvenance): DcaSimulation {
  const points: DcaPoint[] = raw.points
    .map((p) => ({ tradeDate: p.tradeDate.slice(0, 10), returnPct: fractionToPct(p.returnRate) }))
    .filter((p): p is DcaPoint => p.returnPct !== null && /^\d{4}-\d{2}-\d{2}$/.test(p.tradeDate))
    .sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));
  return {
    fundId: raw.fundId,
    range,
    totalReturnPct: raw.ready ? fractionToPct(raw.returnRate) : null,
    points: raw.ready ? points : [],
    ready: raw.ready,
    provenance,
  };
}

function mondayOf(ms: number): number {
  const d = new Date(ms);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
}

/**
 * SoDEX's published DCA method (wealth-api/markets.md): an equal contribution
 * each week, priced at the close of that week's first completed session,
 * cumulative return at each contribution. Only weeks starting on/after the
 * window start count. Reproduces SoDEX's own 1Y curve exactly (verified
 * 2026-11-27 on vVOO); used for 3M/6M, which the API does not serve.
 */
export function simulateWeeklyDca(points: PricePoint[], range: DcaRange): DcaPoint[] {
  if (points.length === 0) return [];
  const sorted = [...points].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
  const last = Date.parse(sorted[sorted.length - 1]!.ts);
  const first = Date.parse(sorted[0]!.ts);
  const start = Math.max(first, rangeStart(last, range));
  const weekFirst = new Map<number, PricePoint>();
  for (const p of sorted) {
    const t = Date.parse(p.ts);
    const wk = mondayOf(t);
    if (wk < start) continue;
    if (!weekFirst.has(wk)) weekFirst.set(wk, p);
  }
  let units = 0;
  let n = 0;
  const out: DcaPoint[] = [];
  for (const p of weekFirst.values()) {
    units += 1 / p.close;
    n += 1;
    out.push({ tradeDate: p.ts.slice(0, 10), returnPct: round(((units * p.close) / n - 1) * 100, 8) });
  }
  return out;
}

export function dcaFromPrices(fundId: string, points: PricePoint[], range: DcaRange, provenance: DataProvenance): DcaSimulation {
  const pts = simulateWeeklyDca(points, range);
  return { fundId, range, totalReturnPct: pts.length > 0 ? pts[pts.length - 1]!.returnPct : null, points: pts, ready: pts.length > 0, provenance };
}

// ---------- Rewards ----------

function msIso(ms: number | null | undefined): string | null {
  return typeof ms === "number" && ms > 0 ? new Date(ms).toISOString() : null;
}

function toMultiplierType(s: string): PointsMultiplier["marketType"] | null {
  const t = s.toLowerCase();
  if (t === "perps" || t === "perp" || t === "futures") return "perps";
  if (t === "spot") return "spot";
  return null;
}

export function toRewardsIncentives(weights: VolumeWeightsRaw, week: WeekInfoRaw, meta: LotteryMetaRaw, provenance: DataProvenance): RewardsIncentives {
  const multipliers: PointsMultiplier[] = [];
  for (const w of weights.weights) {
    const marketType = toMultiplierType(w.market_type);
    const coefficient = num(w.coefficient);
    if (marketType && coefficient !== null) multipliers.push({ marketType, symbol: w.symbol, coefficient });
  }
  const rules = meta.rules ?? null;
  const bps = (v: string | number | null | undefined) => {
    const n = num(v);
    return n === null ? null : round(n / 100, 6);
  };
  return {
    roundId: weights.round?.round_id ?? null,
    roundStart: msIso(weights.round?.start_ts_ms),
    roundEnd: msIso(weights.round?.end_ts_ms),
    multipliers,
    weekName: week.weekName ?? null,
    weekStatus: week.weekStatus ?? null,
    weekPoolPoints: num(week.weekPoolPoints),
    distributionTime: typeof week.distributionTime === "number" ? msIso(week.distributionTime * 1000) : null,
    volumePerBoxUsd: num(rules?.volumePerBoxU),
    takerWeightPct: bps(rules?.takerWeightBps),
    makerWeightPct: bps(rules?.makerWeightBps),
    rewardBands: (rules?.rewardBands ?? [])
      .map((b) => ({ level: b.level, minUsd: num(b.minUsd), maxUsd: num(b.maxUsd) }))
      .filter((b): b is { level: string; minUsd: number; maxUsd: number } => b.minUsd !== null && b.maxUsd !== null),
    probabilitiesPublished: false,
    provenance,
  };
}

/** Lottery feed → RewardFeed. Wallets are dropped; only "open" events kept, newest first. */
export function toRewardFeed(raw: LotteryFeedRaw, provenance: DataProvenance): RewardFeed {
  const items: RewardFeedItem[] = [];
  for (const i of raw.items) {
    if (i.kind && i.kind !== "open") continue;
    const rewardUsd = num(i.rewardUsd);
    if (rewardUsd === null) continue;
    items.push({ tsMs: i.tsMs, level: i.level, rewardUsd, assetSymbol: i.reward?.asset?.symbol ?? "unknown", pfp: i.pfp === true });
  }
  items.sort((a, b) => b.tsMs - a.tsMs);
  return { items, filterNote: FEED_FILTER_NOTE, provenance };
}
