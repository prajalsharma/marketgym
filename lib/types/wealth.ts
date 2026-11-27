/**
 * SoDEX Wealth, Rewards (public reads) and perps contracts. FROZEN; change
 * only via docs/CONTRACTS.md. Every value carries DataProvenance.
 *
 * UNITS (verified against live responses 2026-11-27):
 *  - Wealth /markets `changePct`, `roi*`, `apy*`  -> already PERCENT (e.g. "2.43" = +2.43%)
 *  - Wealth /dca-history `returnRate`              -> FRACTION (e.g. "-0.0209" = -2.09%)
 *  - Normalised types below are ALWAYS percent (number), never fractions.
 *  - Prices, NAV, AUM, amounts arrive as decimal strings; normalised to number.
 */
import type { DataProvenance } from "./market";

/** escrow_vault | clob (tokenised ETF on the order book) | bridged_vault | ssi-v2 (index, e.g. ANT Believers) */
export type WealthFundType = "escrow_vault" | "clob" | "bridged_vault" | "ssi-v2" | "other";

export type WealthMarketStatus = "open" | "pre-market" | "after-hours" | "closed" | "always-open" | "unknown";

export interface WealthFund {
  fundId: string; // case-sensitive, e.g. "vQQQ", "antb", "Morpho-Earn"
  name: string;
  fundType: WealthFundType;
  /** plain-English kind for learners: "Tokenised ETF", "Index", "Yield vault", "Fund vault" */
  kindLabel: string;
  fundStatus: "subscription" | "live" | "other";
  /** share token symbol, e.g. "ANTB.ssi", "vQQQ" */
  shareSymbol: string;
  nav: number | null; // per share; null for clob funds
  aum: number | null; // USD-ish quote units; null when not provided
  spotSymbol: string | null; // e.g. "vQQQ_vUSDC" when tradable on the CLOB
  /** from fund detail when available; percent per year, e.g. 2 = 2% */
  managementFeePct: number | null;
  performanceFeePct: number | null;
  asOf: string; // ISO
  provenance: DataProvenance;
}

export interface WealthQuote {
  fundId: string;
  symbol: string | null;
  fundType: WealthFundType;
  price: number;
  prevClose: number | null;
  changePct: number | null; // percent
  roi24hPct: number | null;
  roi1MPct: number | null;
  roi1YPct: number | null;
  roi3YPct: number | null;
  roiYtdPct: number | null;
  dividendYieldPct: number | null;
  apy7dPct: number | null; // bridged / yield vaults
  apy1MPct: number | null;
  dayVolume: number | null;
  marketStatus: WealthMarketStatus;
  /** provider's own freshness flag for this row */
  priceStatus: "ready" | "stale" | "unavailable" | "unknown";
  priceSource: string | null;
  asOf: string | null;
  provenance: DataProvenance;
}

export interface PricePoint {
  ts: string; // ISO
  close: number;
}

export interface WealthPriceSeries {
  fundId: string;
  symbol: string | null;
  interval: "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
  range: "1D" | "1W" | "1M" | "3M" | "1Y" | "All";
  points: PricePoint[]; // ascending
  provenance: DataProvenance;
}

export interface DcaPoint {
  tradeDate: string; // YYYY-MM-DD
  returnPct: number; // cumulative, percent
}

/** SoDEX public weekly equal-contribution simulation (not any wallet's plan). */
export interface DcaSimulation {
  fundId: string;
  range: "1M" | "3M" | "6M" | "1Y" | "All";
  totalReturnPct: number | null; // percent
  points: DcaPoint[]; // ascending
  ready: boolean;
  provenance: DataProvenance;
}

// ---------- Rewards (public, no wallet) ----------

export interface PointsMultiplier {
  marketType: "spot" | "perps";
  symbol: string; // e.g. "NVDA-USD"
  coefficient: number; // e.g. 1.2
}

export interface RewardsIncentives {
  /** SoPoints Layer 1 Season */
  roundId: number | null;
  roundStart: string | null; // ISO
  roundEnd: string | null; // ISO
  multipliers: PointsMultiplier[];
  weekName: string | null; // "Week 13"
  weekStatus: string | null; // "LIVE"
  weekPoolPoints: number | null;
  distributionTime: string | null; // ISO
  /** Treasure-box campaign rules */
  volumePerBoxUsd: number | null; // trading volume needed per box
  takerWeightPct: number | null; // 100 = taker volume counts fully
  makerWeightPct: number | null; // 20 = maker volume counts 20%
  rewardBands: Array<{ level: string; minUsd: number; maxUsd: number }>;
  /** the docs state drop probabilities are NOT published; always false today */
  probabilitiesPublished: boolean;
  provenance: DataProvenance;
}

export interface RewardFeedItem {
  tsMs: number;
  level: string;
  rewardUsd: number;
  assetSymbol: string;
  pfp: boolean;
}

/** Public feed only lists opens with reward >= USD 50 or a PFP drop, delayed 5 min: a survivorship-biased sample. */
export interface RewardFeed {
  items: RewardFeedItem[];
  filterNote: string;
  provenance: DataProvenance;
}

// ---------- Practice (paper) portfolio ----------

export interface PortfolioHolding {
  fundId: string;
  weightPct: number; // 0..100, holdings sum to 100
}

export interface PaperPortfolio {
  id: string;
  userId: string;
  name: string;
  holdings: PortfolioHolding[];
  strategy: "lump-sum" | "weekly-dca";
  /** learner's written rationale; graded by the evaluator */
  rationale: string;
  createdAt: string;
  updatedAt: string;
}

/** Deterministic analysis computed server-side from real fund data (no LLM). */
export interface PortfolioAnalysis {
  portfolioId: string;
  /** Herfindahl-Hirschman concentration on weights, 0..10000 */
  concentrationHhi: number;
  effectiveHoldings: number; // 10000 / HHI
  largestWeightPct: number;
  /** share of weight in 24/7 crypto assets vs market-hours assets */
  marketHoursSharePct: number;
  /** weighted management fee, percent per year, null when unknown */
  weightedMgmtFeePct: number | null;
  /** weighted 1Y ROI from the market board, percent, null when unavailable */
  weightedRoi1YPct: number | null;
  /** weighted DCA simulation return over 1Y, percent, null when unavailable */
  weightedDcaReturn1YPct: number | null;
  /** plain-English flags, e.g. "More than half your weight is in one fund." */
  flags: string[];
  evidenceAsOf: string; // ISO, oldest provenance used
  provenance: DataProvenance[];
}
