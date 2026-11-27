/**
 * Normalised market-data contracts. UI and AI code only ever sees these
 * shapes, never raw provider payloads. FROZEN — change only via docs/CONTRACTS.md.
 */

/** How fresh/authentic a piece of data is. Every card must display this. */
export type DataSourceKind = "live" | "cached" | "demo";

export interface DataProvenance {
  /** live = fetched from provider for this request; cached = previously fetched, still within TTL or served stale after a failure; demo = deterministic fixture, not real-time. */
  kind: DataSourceKind;
  provider: "sosovalue" | "sodex" | "sodex-wealth" | "sodex-rewards" | "fixture";
  sourceUrl: string;
  /** ISO 8601, when the data was pulled from the provider (or when the fixture was captured). */
  fetchedAt: string;
  /** ISO 8601, when the provider says the data is for (if different from fetchedAt). */
  asOf?: string;
  /** ISO 8601, when the cache entry expires. */
  expiresAt?: string;
  /** Optional human note, e.g. "Provider timed out; serving cached copy from 10:42". */
  note?: string;
}

export interface MarketSnapshot {
  asset: string; // e.g. "BTC"
  name: string; // e.g. "Bitcoin"
  price: number; // quote currency USD
  percentageChange24h: number | null;
  volume24h: number | null;
  marketCapitalisation: number | null;
  timestamp: string; // ISO 8601 of the data point
  provenance: DataProvenance;
}

export type NewsCategory =
  | "market"
  | "etf"
  | "macro"
  | "regulation"
  | "research"
  | "protocol"
  | "other";

export interface NewsEvidence {
  id: string;
  title: string;
  summary: string;
  category: NewsCategory;
  source: string; // publisher name
  sourceUrl: string;
  publishedAt: string; // ISO 8601
  fetchedAt: string; // ISO 8601
  provenance: DataProvenance;
}

export interface EtfFlowPoint {
  date: string; // YYYY-MM-DD
  netInflowUsd: number;
  cumulativeNetInflowUsd: number | null;
  totalNetAssetsUsd: number | null;
  totalVolumeUsd: number | null;
}

export interface EtfFlowSeries {
  asset: "BTC" | "ETH";
  points: EtfFlowPoint[]; // ascending by date
  latest: EtfFlowPoint | null;
  provenance: DataProvenance;
}

export interface IndexConstituent {
  symbol: string;
  name: string;
  weight: number; // 0..1
}

export interface IndexSnapshot {
  id: string;
  name: string;
  description: string;
  value: number | null;
  percentageChange24h: number | null;
  constituents: IndexConstituent[]; // descending weight
  asOf: string; // ISO 8601
  provenance: DataProvenance;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  /** cumulative quantity from the top of book to this level */
  cumulativeQuantity: number;
}

export interface OrderBookSnapshot {
  market: string; // spot "vBTC_vUSDC"; perps are addressed as "perps:ANT-USD"
  /** spot (default) or perps; perps books are read-only teaching material, never traded */
  marketType?: "spot" | "perps";
  displayName: string; // e.g. "BTC/USDC"
  baseAsset: string;
  quoteAsset: string;
  tickSize: number;
  lotSize: number; // SoDEX "stepSize"
  bids: OrderBookLevel[]; // descending price
  asks: OrderBookLevel[]; // ascending price
  bestBid: number | null;
  bestAsk: number | null;
  midPrice: number | null;
  spread: number | null;
  spreadPercentage: number | null;
  /** sum(bid qty) / (sum(bid qty) + sum(ask qty)) over returned levels; 0.5 = balanced */
  bidShareOfDepth: number | null;
  timestamp: string; // ISO 8601 (blockTime)
  provenance: DataProvenance;
}

/** Everything a scenario can cite. Stored verbatim with the scenario. */
export interface EvidencePack {
  id: string;
  createdAt: string;
  snapshots: MarketSnapshot[];
  news: NewsEvidence[];
  etfFlows: EtfFlowSeries[];
  indexes: IndexSnapshot[];
  orderBooks: OrderBookSnapshot[];
  /** SoDEX Wealth (optional; older scenarios do not have it) */
  wealthFunds?: import("./wealth").WealthFund[];
  wealthQuotes?: import("./wealth").WealthQuote[];
  wealthPrices?: import("./wealth").WealthPriceSeries[];
  dcaSimulations?: import("./wealth").DcaSimulation[];
  /** SoDEX Rewards public data (optional) */
  rewardIncentives?: import("./wealth").RewardsIncentives | null;
  rewardFeed?: import("./wealth").RewardFeed | null;
}
