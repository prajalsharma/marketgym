/**
 * SoDEX order book → OrderBookSnapshot with cumulative depth, spread, mid
 * and bid share of depth. Pure.
 */
import type { DataProvenance, OrderBookLevel, OrderBookSnapshot } from "@/lib/types";
import type { OrderBookRaw, SpotSymbol } from "./schemas";

export interface SymbolMeta {
  name: string;
  displayName: string;
  baseAsset: string;
  quoteAsset: string;
  tickSize: number;
  lotSize: number;
  status: string;
  marketType?: "spot" | "perps";
}

/** app-level id for a perps market: "ANT-USD" → "perps:ANT-USD" */
export const PERPS_PREFIX = "perps:";
export const PERPS_MARKET_RE = /^perps:[A-Za-z0-9]+-[A-Za-z0-9]+$/;
export const SPOT_MARKET_RE = /^[A-Za-z0-9]+_[A-Za-z0-9]+$/;

export function isPerpsMarket(market: string): boolean {
  return PERPS_MARKET_RE.test(market);
}

export function toSymbolMeta(s: SpotSymbol): SymbolMeta {
  return {
    marketType: "spot",
    name: s.name,
    displayName: s.displayName,
    baseAsset: s.baseCoin,
    quoteAsset: s.quoteCoin,
    tickSize: Number(s.tickSize),
    lotSize: Number(s.stepSize),
    status: s.status,
  };
}

/** perps symbol (same wire shape as spot) → meta addressed as "perps:ANT-USD", label "ANT-USD perpetual" */
export function toPerpsSymbolMeta(s: SpotSymbol): SymbolMeta {
  return {
    marketType: "perps",
    name: `${PERPS_PREFIX}${s.name}`,
    displayName: `${s.displayName || s.name} perpetual`,
    baseAsset: s.baseCoin,
    quoteAsset: s.quoteCoin,
    tickSize: Number(s.tickSize),
    lotSize: Number(s.stepSize),
    status: s.status,
  };
}

function cumulative(levels: Array<[string, string]>, sort: "desc" | "asc"): OrderBookLevel[] {
  const parsed = levels
    .map(([p, q]) => ({ price: Number(p), quantity: Number(q) }))
    .filter((l) => Number.isFinite(l.price) && Number.isFinite(l.quantity) && l.quantity > 0 && l.price > 0)
    .sort((a, b) => (sort === "desc" ? b.price - a.price : a.price - b.price));
  let run = 0;
  return parsed.map((l) => {
    run += l.quantity;
    return { price: l.price, quantity: l.quantity, cumulativeQuantity: round(run, 10) };
  });
}

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

export function toOrderBookSnapshot(meta: SymbolMeta, raw: OrderBookRaw, provenance: DataProvenance): OrderBookSnapshot {
  const bids = cumulative(raw.bids, "desc");
  const asks = cumulative(raw.asks, "asc");
  const bestBid = bids[0]?.price ?? null;
  const bestAsk = asks[0]?.price ?? null;
  const both = bestBid !== null && bestAsk !== null;
  const midPrice = both ? round((bestBid + bestAsk) / 2, 10) : null;
  const spread = both ? round(bestAsk - bestBid, 10) : null;
  const spreadPercentage = both && midPrice ? round((spread! / midPrice) * 100, 8) : null;
  const bidDepth = bids.length > 0 ? bids[bids.length - 1]!.cumulativeQuantity : 0;
  const askDepth = asks.length > 0 ? asks[asks.length - 1]!.cumulativeQuantity : 0;
  const bidShareOfDepth = bidDepth + askDepth > 0 ? round(bidDepth / (bidDepth + askDepth), 6) : null;
  return {
    market: meta.name,
    marketType: meta.marketType ?? "spot",
    displayName: meta.displayName,
    baseAsset: meta.baseAsset,
    quoteAsset: meta.quoteAsset,
    tickSize: meta.tickSize,
    lotSize: meta.lotSize,
    bids,
    asks,
    bestBid,
    bestAsk,
    midPrice,
    spread,
    spreadPercentage,
    bidShareOfDepth,
    timestamp: new Date(raw.blockTime).toISOString(),
    provenance,
  };
}
