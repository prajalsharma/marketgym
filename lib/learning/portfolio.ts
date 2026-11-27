/**
 * Practice (paper) portfolio analysis. Pure and deterministic: every number
 * is computed from the portfolio weights and the real fund data passed in
 * (no model, no clock, no invented figures). Missing data stays null and is
 * named in a flag, never treated as zero.
 *
 * Conventions (docs/CONTRACTS.md, Wave 2):
 *  - weights are percent; HHI = Σ weight² on percent weights (0..10000)
 *  - market-hours funds: tokenised ETFs on the order book ("clob") and escrow
 *    vaults; 24/7: the "ssi-v2" index fund and the bridged USDC yield vault
 *  - all returns / fees are percent (normalised types are never fractions)
 */
import { getExerciseTemplate } from "@/lib/curriculum";
import type { Scenario } from "@/lib/types/learning";
import type { DataProvenance, EvidencePack } from "@/lib/types/market";
import type { DcaSimulation, PaperPortfolio, PortfolioAnalysis, WealthFund, WealthFundType, WealthQuote } from "@/lib/types/wealth";
import { buildScenario } from "./scenario-generator";

export const PORTFOLIO_REVIEW_TEMPLATE_ID = "ex.wealth.portfolio-review";

/** fund types whose price follows a stock market's trading hours */
export const MARKET_HOURS_FUND_TYPES: ReadonlySet<WealthFundType> = new Set<WealthFundType>(["clob", "escrow_vault"]);
/** fund types that price around the clock */
export const ALWAYS_OPEN_FUND_TYPES: ReadonlySet<WealthFundType> = new Set<WealthFundType>(["ssi-v2", "bridged_vault"]);

/**
 * Plain theme labels for the funds on the SoDEX board, used only to spot
 * several holdings that share one theme. Unknown ids fall back to their
 * fund type, so new funds never get a made-up theme.
 */
const FUND_THEMES: Record<string, string> = {
  vQQQ: "US large-cap tech",
  vVGT: "US large-cap tech",
  vSMH: "US large-cap tech",
  vVOO: "US broad equity",
  vSCHD: "US dividend equity",
  vVYM: "US dividend equity",
  vBOXX: "cash-like / short-term yield",
  "Morpho-Earn": "cash-like / short-term yield",
  vSTRC: "preferred / credit",
  antb: "crypto ecosystem (ANT)",
  CXMT: "single private company",
  UNITREE: "single private company",
};

const FUND_TYPE_THEME: Record<WealthFundType, string> = {
  clob: "tokenised ETF",
  escrow_vault: "fund vault",
  bridged_vault: "yield vault",
  "ssi-v2": "index fund",
  other: "other",
};

export function themeForFund(fundId: string, fundType: WealthFundType | null): string {
  return FUND_THEMES[fundId] ?? (fundType ? FUND_TYPE_THEME[fundType] : "unknown");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function signedPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function provenanceKey(p: DataProvenance): string {
  return `${p.provider}|${p.kind}|${p.sourceUrl}|${p.fetchedAt}|${p.asOf ?? ""}`;
}

function provenanceTime(p: DataProvenance): string {
  return p.asOf ?? p.fetchedAt;
}

function listIds(ids: string[]): string {
  if (ids.length <= 1) return ids.join("");
  return `${ids.slice(0, -1).join(", ")} and ${ids[ids.length - 1]}`;
}

/** weighted sum over holdings, or null when any holding lacks the value */
function weightedOrNull(weights: Array<{ fundId: string; w: number }>, valueOf: (fundId: string) => number | null): { value: number | null; missing: string[] } {
  let sum = 0;
  const missing: string[] = [];
  for (const h of weights) {
    const v = valueOf(h.fundId);
    if (v === null || !Number.isFinite(v)) missing.push(h.fundId);
    else sum += (h.w / 100) * v;
  }
  return { value: missing.length > 0 ? null : round2(sum), missing };
}

export interface PortfolioAnalysisContext {
  funds: WealthFund[];
  quotes: WealthQuote[];
  dca: DcaSimulation[];
}

export function analysePortfolio(portfolio: PaperPortfolio, ctx: PortfolioAnalysisContext): PortfolioAnalysis {
  const fundById = new Map(ctx.funds.map((f) => [f.fundId, f] as const));
  const quoteById = new Map(ctx.quotes.map((q) => [q.fundId, q] as const));
  const dcaById = new Map<string, DcaSimulation>();
  for (const d of ctx.dca) if (d.range === "1Y") dcaById.set(d.fundId, d);

  // merge duplicate fund ids defensively, drop non-positive weights, normalise to 100
  const merged = new Map<string, number>();
  for (const h of portfolio.holdings) {
    if (!(h.weightPct > 0)) continue;
    merged.set(h.fundId, (merged.get(h.fundId) ?? 0) + h.weightPct);
  }
  const total = [...merged.values()].reduce((a, b) => a + b, 0);
  const weights = [...merged.entries()].map(([fundId, raw]) => ({ fundId, w: total > 0 ? (raw / total) * 100 : 0 }));

  const flags: string[] = [];
  const provenance = new Map<string, DataProvenance>();
  const recordProvenance = (p: DataProvenance | undefined) => {
    if (p) provenance.set(provenanceKey(p), p);
  };

  if (weights.length === 0) {
    return {
      portfolioId: portfolio.id,
      concentrationHhi: 0,
      effectiveHoldings: 0,
      largestWeightPct: 0,
      marketHoursSharePct: 0,
      weightedMgmtFeePct: null,
      weightedRoi1YPct: null,
      weightedDcaReturn1YPct: null,
      flags: ["The portfolio has no holdings, so there is nothing to analyse."],
      evidenceAsOf: portfolio.updatedAt,
      provenance: [],
    };
  }

  // concentration
  const hhi = weights.reduce((s, h) => s + h.w * h.w, 0);
  const largest = weights.reduce((a, b) => (b.w > a.w ? b : a));
  const concentrationHhi = round2(hhi);
  const effectiveHoldings = hhi > 0 ? round2(10000 / hhi) : 0;
  const largestWeightPct = round2(largest.w);

  // fund types and market hours
  const typeOf = (fundId: string): WealthFundType | null => fundById.get(fundId)?.fundType ?? quoteById.get(fundId)?.fundType ?? null;
  const unknownFunds = weights.filter((h) => !fundById.has(h.fundId) && !quoteById.has(h.fundId)).map((h) => h.fundId);
  let marketHours = 0;
  for (const h of weights) {
    const t = typeOf(h.fundId);
    if (t && MARKET_HOURS_FUND_TYPES.has(t)) marketHours += h.w;
    recordProvenance(fundById.get(h.fundId)?.provenance);
    recordProvenance(quoteById.get(h.fundId)?.provenance);
  }
  const marketHoursSharePct = round2(marketHours);

  // fees, returns, DCA
  const fee = weightedOrNull(weights, (id) => fundById.get(id)?.managementFeePct ?? null);
  const roi = weightedOrNull(weights, (id) => quoteById.get(id)?.roi1YPct ?? null);
  const dca = weightedOrNull(weights, (id) => {
    const d = dcaById.get(id);
    if (!d || !d.ready) return null;
    return d.totalReturnPct;
  });
  for (const h of weights) recordProvenance(dcaById.get(h.fundId)?.provenance);

  // ---- flags (plain English, numbers computed above) ----
  if (largest.w > 50) {
    flags.push(`More than half your weight (${fmt(largestWeightPct)}%) is in one fund, ${largest.fundId}. Its moves will dominate the portfolio.`);
  }
  const themeWeights = new Map<string, { w: number; funds: string[] }>();
  for (const h of weights) {
    const theme = themeForFund(h.fundId, typeOf(h.fundId));
    const entry = themeWeights.get(theme) ?? { w: 0, funds: [] };
    entry.w += h.w;
    entry.funds.push(h.fundId);
    themeWeights.set(theme, entry);
  }
  for (const [theme, entry] of themeWeights) {
    if (entry.funds.length >= 2 && entry.w > 50 && theme !== "unknown") {
      flags.push(`${fmt(round2(entry.w))}% of your weight is in ${entry.funds.length} funds that share one theme (${theme}: ${listIds(entry.funds)}). They tend to move together, so holding several of them is not much diversification.`);
    }
  }
  if (marketHoursSharePct >= 100 - 1e-9) {
    flags.push("All of your weight follows stock-market trading hours. Outside those hours the prices you see are last prices or pre-market prints, not live quotes.");
  }
  if (unknownFunds.length > 0) {
    flags.push(`No fund data was found for ${listIds(unknownFunds)}, so those holdings could not be analysed.`);
  }
  if (fee.missing.length > 0) {
    flags.push(`Management fees are not published for ${listIds(fee.missing)}. The weighted fee is unknown, not zero.`);
  }
  if (roi.missing.length > 0) {
    flags.push(`A 1-year return is missing for ${listIds(roi.missing)}, so no weighted 1-year return is shown.`);
  }
  if (dca.missing.length > 0) {
    flags.push(`No 1-year DCA simulation is available for ${listIds(dca.missing)}, so no weighted DCA return is shown.`);
  }
  const stale = weights.filter((h) => {
    const s = quoteById.get(h.fundId)?.priceStatus;
    return s === "stale" || s === "unavailable";
  }).map((h) => h.fundId);
  if (stale.length > 0) {
    flags.push(`The provider flags the price of ${listIds(stale)} as stale or unavailable.`);
  }

  const provenanceList = [...provenance.values()].sort((a, b) => provenanceTime(a).localeCompare(provenanceTime(b)) || provenanceKey(a).localeCompare(provenanceKey(b)));
  const evidenceAsOf = provenanceList.length > 0 ? provenanceTime(provenanceList[0]) : portfolio.updatedAt;

  return {
    portfolioId: portfolio.id,
    concentrationHhi,
    effectiveHoldings,
    largestWeightPct,
    marketHoursSharePct,
    weightedMgmtFeePct: fee.value,
    weightedRoi1YPct: roi.value,
    weightedDcaReturn1YPct: dca.value,
    flags,
    evidenceAsOf,
    provenance: provenanceList,
  };
}

/**
 * Plain-English summary of the analysis: every figure is copied from the
 * analysis (or the portfolio's own weights). Starts with the marker
 * "Portfolio analysis:" so the rules evaluator can credit learners who quote
 * these computed numbers.
 */
export function describePortfolioAnalysis(portfolio: PaperPortfolio, analysis: PortfolioAnalysis, funds: WealthFund[] = []): string {
  const kind = new Map(funds.map((f) => [f.fundId, f.kindLabel] as const));
  const holdings = [...portfolio.holdings]
    .sort((a, b) => b.weightPct - a.weightPct || a.fundId.localeCompare(b.fundId))
    .map((h) => `${h.fundId} ${fmt(h.weightPct)}%${kind.get(h.fundId) ? ` (${kind.get(h.fundId)})` : ""}`)
    .join(", ");
  const parts = [
    `Portfolio analysis: holdings ${holdings}; strategy ${portfolio.strategy === "weekly-dca" ? "weekly DCA" : "lump sum"}.`,
    `Concentration HHI ${fmt(analysis.concentrationHhi)} (about ${analysis.effectiveHoldings.toFixed(2)} effective holdings); largest weight ${fmt(analysis.largestWeightPct)}%.`,
    `Market-hours share ${fmt(analysis.marketHoursSharePct)}% (the rest prices around the clock).`,
    `Weighted management fee: ${analysis.weightedMgmtFeePct === null ? "unknown" : `${analysis.weightedMgmtFeePct.toFixed(2)}% a year`}.`,
    `Weighted 1-year return on the board: ${analysis.weightedRoi1YPct === null ? "not available" : signedPct(analysis.weightedRoi1YPct)}.`,
    `Weighted 1-year DCA simulation return: ${analysis.weightedDcaReturn1YPct === null ? "not available" : signedPct(analysis.weightedDcaReturn1YPct)} (past, simulated, not a forecast).`,
    analysis.flags.length > 0 ? `Flags: ${analysis.flags.join(" ")}` : "Flags: none.",
    `Evidence as of ${analysis.evidenceAsOf}.`,
  ];
  return parts.join(" ");
}

/**
 * Wraps template "ex.wealth.portfolio-review" around the learner's
 * portfolio so evaluateAttempt grades the rationale. The learner's portfolio
 * name is not copied into the scenario (it is free text and would reach the
 * grading prompt outside an untrusted block).
 */
export function portfolioScenario(portfolio: PaperPortfolio, analysis: PortfolioAnalysis, evidence: EvidencePack, id: string): Scenario {
  const template = getExerciseTemplate(PORTFOLIO_REVIEW_TEMPLATE_ID);
  if (!template) throw new Error(`missing exercise template ${PORTFOLIO_REVIEW_TEMPLATE_ID}`);
  const base = buildScenario(template, evidence, id);
  return {
    ...base,
    // base.description = objective + evidence inventory + freshness; the analysis goes last
    description: `${base.description} ${describePortfolioAnalysis(portfolio, analysis, evidence.wealthFunds ?? [])}`,
  };
}
