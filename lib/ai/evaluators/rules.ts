/**
 * Deterministic evaluator. Scores a free-text scenario answer on the four
 * rubric dimensions from observable text features only:
 *  - factual: coverage of rubric.keyPoints (token overlap / phrase runs), minus
 *    contradictions of the attached evidence; 0 when off-topic
 *  - evidence: distinct references to the attached pack (assets, pack figures
 *    ±1 %, news titles/sources, dates, market-structure terms)
 *  - reasoning: causal connectors, observation→interpretation separation,
 *    length sanity, minus unsupported certainty
 *  - uncertainty: hedges and explicit limits ("cannot conclude", "would need")
 *  - misconception cues from the curriculum (word-boundary, negation-aware)
 * It is the floor/ceiling guard for the LLM evaluator and the only evaluator
 * in offline mode. Fully synchronous; no model.
 */
import type { Misconception } from "@/lib/types/curriculum";
import type { RubricScores, Scenario } from "@/lib/types/learning";
import type { EvidencePack } from "@/lib/types/market";
import { curriculum } from "@/lib/curriculum";
import {
  approxEqual,
  clamp,
  contentTokens,
  extractNumbers,
  hasPhraseRun,
  matchPhraseUnnegated,
  normalise,
  round,
  sentences,
  tokenCoverage,
  uniq,
  wordCount,
} from "./text";

export interface RulesEvaluation {
  rubricScores: RubricScores;
  matchedKeyPoints: string[];
  partialKeyPoints: string[];
  missingKeyPoints: string[];
  /** distinct evidence references found, e.g. "asset:BTC", "figure:75576", "news:abc", "term:spread" */
  evidenceReferences: string[];
  contradictions: string[];
  misconceptionIds: string[];
  misconceptionCues: Array<{ misconceptionId: string; cue: string }>;
  reasoning: { connectors: string[]; separatesObservationFromInterpretation: boolean; wordCount: number; unsupportedCertainty: string[] };
  uncertainty: { hedges: string[]; explicitLimits: string[] };
  offTopic: boolean;
}

export interface RulesInput {
  scenario: Scenario;
  answer: string;
  /** defaults to the curriculum's misconceptions */
  misconceptions?: Misconception[];
}

const CONNECTORS = [
  "because", "so ", "which means", "this means", "therefore", "hence", "however", "but ", "although", "whereas",
  "as a result", "suggests", "implies", "indicates", "that means", "given that", "since ", "consequently", "yet ",
];
const OBSERVATION_MARKERS = [
  "shows", "show ", "the data", "the pack", "the snapshot", "the book", "the order book", "reports", "is at", "was ",
  "i see", "we see", "i can see", "according to", "the figure", "the number", "the headline", "the series", "the flow",
  "the evidence", "recorded", "printed", "quoted",
];
const INTERPRETATION_MARKERS = [
  "suggests", "implies", "could mean", "may mean", "might mean", "i think", "i read this", "interpret", "indicates",
  "this means", "which means", "likely", "points to", "consistent with", "my reading", "i would read", "i read",
];
const CERTAINTY = [
  "definitely", "guaranteed", "certainly", "for sure", "no doubt", "obviously", "100%", "always", "never fails",
  "will rise", "will fall", "will go up", "will go down", "will pump", "will dump", "will moon", "is going to rise",
  "is going to fall", "will continue", "must rise", "must fall", "clearly means", "proves",
];
const HEDGES = [
  "may ", "might", "could", "possibly", "perhaps", "likely", "unlikely", "appears", "seems", "suggests", "tends",
  "not necessarily", "uncertain", "probably", "on balance", "one reading", "another reading", "alternatively",
  "it is possible", "i am not sure", "hard to say", "ambiguous", "tentative",
];
const EXPLICIT_LIMITS = [
  "cannot conclude", "cant conclude", "can not conclude", "cannot tell", "cant tell", "cannot say", "cant say",
  "does not tell", "doesnt tell", "does not show", "doesnt show", "would need", "i would want", "need more",
  "need to see", "not enough", "insufficient", "invalidated", "would be wrong if", "would change my view",
  "unless", "single day", "one day", "sample", "no way to know", "do not know", "dont know", "cannot know",
  "would not know", "doesnt mean", "does not mean", "doesnt prove", "does not prove", "not proof", "no evidence that",
  "would need to check", "to confirm", "without more", "without knowing", "limited", "caveat",
];
const STRUCTURE_TERMS = [
  "spread", "depth", "bid", "ask", "order book", "orderbook", "imbalance", "liquidity", "volume", "market cap",
  "inflow", "outflow", "net flow", "flows", "aum", "net assets", "constituent", "weight", "weighting",
  "concentration", "tick", "lot size", "best bid", "best ask", "mid price", "cumulative", "24h", "24-hour",
  // wave 2: funds, yield, incentives, perps
  "nav", "net asset value", "premium", "discount", "management fee", "performance fee", "fee drag", "apy", "roi",
  "dca", "lump sum", "hhi", "effective holdings", "market hours", "market-hours", "pre-market", "closed", "stale",
  "multiplier", "reward box", "maker", "taker", "survivorship", "perpetual", "perp", "funding",
];
const BOOK_TERMS = ["spread", "depth", "bid", "ask", "order book", "orderbook", "imbalance", "tick", "lot size", "best bid", "best ask", "mid price", "cumulative"];
const FLOW_TERMS = ["inflow", "outflow", "net flow", "flows", "aum", "net assets"];
const INDEX_TERMS = ["constituent", "weight", "weighting", "concentration"];
const WEALTH_TERMS = ["nav", "net asset value", "premium", "discount", "management fee", "performance fee", "fee drag", "apy", "roi", "dca", "lump sum", "hhi", "effective holdings", "market hours", "market-hours", "pre-market", "closed", "stale"];
const REWARD_TERMS = ["multiplier", "reward box", "maker", "taker", "survivorship"];
const PERPS_TERMS = ["perpetual", "perp", "funding"];

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

interface PackFacts {
  assets: Array<{ asset: string; name: string }>;
  figures: Array<{ value: number; label: string }>;
  news: Array<{ id: string; title: string; source: string }>;
  dates: Set<string>; // YYYY-MM-DD
  priceDirections: Array<{ asset: string; name: string; change: number }>;
  flowDirections: Array<{ asset: string; latestFlow: number }>;
  bidShares: Array<{ market: string; share: number }>;
}

function packFacts(pack: EvidencePack): PackFacts {
  const facts: PackFacts = { assets: [], figures: [], news: [], dates: new Set(), priceDirections: [], flowDirections: [], bidShares: [] };
  const addDate = (iso: string | undefined) => {
    if (!iso) return;
    const d = iso.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) facts.dates.add(d);
  };
  for (const s of pack.snapshots) {
    facts.assets.push({ asset: s.asset, name: s.name });
    facts.figures.push({ value: s.price, label: `${s.asset} price` });
    if (s.percentageChange24h !== null) {
      facts.figures.push({ value: s.percentageChange24h, label: `${s.asset} 24h change` });
      facts.priceDirections.push({ asset: s.asset, name: s.name, change: s.percentageChange24h });
    }
    if (s.volume24h !== null) facts.figures.push({ value: s.volume24h, label: `${s.asset} volume` });
    if (s.marketCapitalisation !== null) facts.figures.push({ value: s.marketCapitalisation, label: `${s.asset} market cap` });
    addDate(s.timestamp);
  }
  for (const n of pack.news) {
    facts.news.push({ id: n.id, title: n.title, source: n.source });
    addDate(n.publishedAt);
  }
  for (const f of pack.etfFlows) {
    facts.assets.push({ asset: f.asset, name: `${f.asset} ETF` });
    for (const p of f.points.slice(-10)) {
      facts.figures.push({ value: p.netInflowUsd, label: `${f.asset} ETF net flow ${p.date}` });
      if (p.totalNetAssetsUsd !== null) facts.figures.push({ value: p.totalNetAssetsUsd, label: `${f.asset} ETF net assets ${p.date}` });
      if (p.cumulativeNetInflowUsd !== null) facts.figures.push({ value: p.cumulativeNetInflowUsd, label: `${f.asset} ETF cumulative ${p.date}` });
      facts.dates.add(p.date);
    }
    if (f.latest) facts.flowDirections.push({ asset: f.asset, latestFlow: f.latest.netInflowUsd });
  }
  for (const i of pack.indexes) {
    if (i.value !== null) facts.figures.push({ value: i.value, label: `${i.name} value` });
    if (i.percentageChange24h !== null) facts.figures.push({ value: i.percentageChange24h, label: `${i.name} 24h change` });
    for (const c of i.constituents.slice(0, 10)) {
      facts.assets.push({ asset: c.symbol, name: c.name });
      facts.figures.push({ value: c.weight * 100, label: `${c.symbol} weight %` });
    }
    addDate(i.asOf);
  }
  addWealthFacts(pack, facts, addDate);
  for (const b of pack.orderBooks) {
    facts.assets.push({ asset: b.baseAsset.replace(/^v/, ""), name: b.displayName });
    if (b.bestBid !== null) facts.figures.push({ value: b.bestBid, label: `${b.displayName} best bid` });
    if (b.bestAsk !== null) facts.figures.push({ value: b.bestAsk, label: `${b.displayName} best ask` });
    if (b.spread !== null) facts.figures.push({ value: b.spread, label: `${b.displayName} spread` });
    if (b.spreadPercentage !== null) facts.figures.push({ value: b.spreadPercentage, label: `${b.displayName} spread %` });
    if (b.midPrice !== null) facts.figures.push({ value: b.midPrice, label: `${b.displayName} mid` });
    if (b.bidShareOfDepth !== null) {
      facts.figures.push({ value: b.bidShareOfDepth * 100, label: `${b.displayName} bid share %` });
      facts.bidShares.push({ market: b.displayName, share: b.bidShareOfDepth });
    }
    for (const l of [...b.bids.slice(0, 5), ...b.asks.slice(0, 5)]) facts.figures.push({ value: l.price, label: `${b.displayName} level` });
    addDate(b.timestamp);
  }
  return facts;
}

type AddDate = (iso: string | undefined) => void;

/** fund, yield, DCA and rewards figures from the optional wave 2 pack fields */
function addWealthFacts(pack: EvidencePack, facts: PackFacts, addDate: AddDate): void {
  for (const f of pack.wealthFunds ?? []) {
    facts.assets.push({ asset: f.fundId, name: f.name });
    if (f.shareSymbol) facts.assets.push({ asset: f.shareSymbol, name: f.name });
    if (f.nav !== null) facts.figures.push({ value: f.nav, label: `${f.fundId} NAV` });
    if (f.aum !== null) facts.figures.push({ value: f.aum, label: `${f.fundId} AUM` });
    if (f.managementFeePct !== null) facts.figures.push({ value: f.managementFeePct, label: `${f.fundId} management fee %` });
    if (f.performanceFeePct !== null) facts.figures.push({ value: f.performanceFeePct, label: `${f.fundId} performance fee %` });
    addDate(f.asOf);
  }
  for (const q of pack.wealthQuotes ?? []) {
    facts.assets.push({ asset: q.fundId, name: q.symbol ?? q.fundId });
    facts.figures.push({ value: q.price, label: `${q.fundId} price` });
    const pairs: Array<[number | null, string]> = [
      [q.prevClose, "prev close"], [q.changePct, "change %"], [q.roi24hPct, "24h ROI %"], [q.roi1MPct, "1M ROI %"],
      [q.roi1YPct, "1Y ROI %"], [q.roi3YPct, "3Y ROI %"], [q.roiYtdPct, "YTD ROI %"], [q.dividendYieldPct, "dividend yield %"],
      [q.apy7dPct, "7-day APY %"], [q.apy1MPct, "1-month APY %"], [q.dayVolume, "day volume"],
    ];
    for (const [v, label] of pairs) if (v !== null) facts.figures.push({ value: v, label: `${q.fundId} ${label}` });
    addDate(q.asOf ?? undefined);
  }
  for (const series of pack.wealthPrices ?? []) {
    const first = series.points[0];
    const last = series.points[series.points.length - 1];
    if (first) facts.figures.push({ value: first.close, label: `${series.fundId} ${series.range} first close` });
    if (last) facts.figures.push({ value: last.close, label: `${series.fundId} ${series.range} last close` });
    if (first && last && first.close !== 0) facts.figures.push({ value: ((last.close - first.close) / first.close) * 100, label: `${series.fundId} ${series.range} change %` });
    if (series.points.length > 0) {
      const closes = series.points.map((p) => p.close);
      facts.figures.push({ value: Math.min(...closes), label: `${series.fundId} ${series.range} low` });
      facts.figures.push({ value: Math.max(...closes), label: `${series.fundId} ${series.range} high` });
    }
    addDate(first?.ts);
    addDate(last?.ts);
  }
  for (const d of pack.dcaSimulations ?? []) {
    facts.assets.push({ asset: d.fundId, name: d.fundId });
    if (d.totalReturnPct !== null) facts.figures.push({ value: d.totalReturnPct, label: `${d.fundId} DCA ${d.range} return %` });
    const last = d.points[d.points.length - 1];
    if (last) facts.figures.push({ value: last.returnPct, label: `${d.fundId} DCA last point %` });
    addDate(d.points[0]?.tradeDate);
    addDate(last?.tradeDate);
  }
  const inc = pack.rewardIncentives;
  if (inc) {
    for (const m of inc.multipliers) {
      facts.assets.push({ asset: m.symbol, name: m.symbol });
      facts.figures.push({ value: m.coefficient, label: `${m.coefficient}x points multiplier` });
    }
    const pairs: Array<[number | null, string]> = [
      [inc.volumePerBoxUsd, "volume per reward box"], [inc.takerWeightPct, "taker weight %"], [inc.makerWeightPct, "maker weight %"],
      [inc.weekPoolPoints, "weekly points pool"],
    ];
    for (const [v, label] of pairs) if (v !== null) facts.figures.push({ value: v, label });
    for (const b of inc.rewardBands) {
      facts.figures.push({ value: b.minUsd, label: `${b.level} band min` });
      facts.figures.push({ value: b.maxUsd, label: `${b.level} band max` });
    }
    addDate(inc.roundStart ?? undefined);
    addDate(inc.roundEnd ?? undefined);
  }
  for (const item of (pack.rewardFeed?.items ?? []).slice(0, 20)) {
    facts.figures.push({ value: item.rewardUsd, label: `reward feed ${item.level} ${item.rewardUsd} USD` });
  }
}

/**
 * Figures that lib/learning/portfolio.ts computed and wrote into a scenario
 * description after the "Portfolio analysis:" marker (HHI, effective
 * holdings, weights, shares, weighted fee/returns). Labelled patterns only,
 * so timestamps and counts in the description never become "evidence".
 */
export function analysisFiguresFromDescription(description: string): Array<{ value: number; label: string }> {
  const idx = description.indexOf("Portfolio analysis:");
  if (idx < 0) return [];
  const text = description.slice(idx);
  const out: Array<{ value: number; label: string }> = [];
  const grab = (re: RegExp, label: string) => {
    const m = re.exec(text);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n)) out.push({ value: n, label });
    }
  };
  grab(/HHI (-?[\d.]+)/, "portfolio HHI");
  grab(/about (-?[\d.]+) effective holdings/, "portfolio effective holdings");
  grab(/largest weight (-?[\d.]+)%/, "portfolio largest weight %");
  grab(/Market-hours share (-?[\d.]+)%/, "portfolio market-hours share %");
  grab(/management fee: (-?[\d.]+)%/, "portfolio weighted fee %");
  grab(/return on the board: ([+-]?[\d.]+)%/, "portfolio weighted 1Y ROI %");
  grab(/DCA simulation return: ([+-]?[\d.]+)%/, "portfolio weighted DCA return %");
  const holdings = /holdings (.*?); strategy/.exec(text)?.[1] ?? "";
  for (const m of holdings.matchAll(/([A-Za-z0-9_-]+) (\d+(?:\.\d+)?)%/g)) out.push({ value: Number(m[2]), label: `${m[1]} portfolio weight %` });
  return out;
}

function findEvidenceReferences(answer: string, pack: EvidencePack, scenarioDescription = ""): string[] {
  const facts = packFacts(pack);
  const norm = normalise(answer);
  const tokens = contentTokens(answer);
  const refs: string[] = [];

  for (const a of uniq(facts.assets.map((x) => `${x.asset}|${x.name}`))) {
    const [asset, name] = a.split("|");
    const assetRe = new RegExp(`(^|[^a-z0-9])${asset.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9])`);
    const nameNorm = normalise(name);
    if (assetRe.test(norm) || (nameNorm.length > 2 && norm.includes(nameNorm))) refs.push(`asset:${asset}`);
  }

  const numbers = extractNumbers(answer);
  // computed portfolio-analysis figures first, so "100%" credits the market-hours share rather than an unrelated price near 100
  const figures = [...analysisFiguresFromDescription(scenarioDescription), ...facts.figures];
  for (const n of numbers) {
    const hit = figures.find((f) => f.value !== 0 && approxEqual(n, f.value, 0.01));
    if (hit) refs.push(`figure:${hit.label}`);
  }

  for (const n of facts.news) {
    if (hasPhraseRun(n.title, tokens, 3) || (n.source.length > 2 && norm.includes(normalise(n.source)))) refs.push(`news:${n.id}`);
  }

  for (const d of facts.dates) {
    const [y, m, day] = d.split("-");
    const monthName = MONTHS[Number(m) - 1];
    const dayNum = String(Number(day));
    if (
      norm.includes(d) ||
      new RegExp(`(^|[^0-9])${dayNum}(st|nd|rd|th)?\\s+${monthName}`).test(norm) ||
      new RegExp(`${monthName}[a-z]*\\s+${dayNum}(st|nd|rd|th)?([^0-9]|$)`).test(norm) ||
      norm.includes(`${day}/${m}/${y}`) ||
      norm.includes(`${m}/${day}/${y}`)
    ) {
      refs.push(`date:${d}`);
    }
  }

  const hasBooks = pack.orderBooks.length > 0;
  const hasWealth = (pack.wealthFunds?.length ?? 0) + (pack.wealthQuotes?.length ?? 0) + (pack.wealthPrices?.length ?? 0) + (pack.dcaSimulations?.length ?? 0) > 0;
  const hasFlows = pack.etfFlows.length > 0 || (pack.wealthFunds ?? []).some((f) => f.aum !== null);
  const hasIndexes = pack.indexes.length > 0 || hasWealth;
  const hasRewards = Boolean(pack.rewardIncentives || pack.rewardFeed);
  const hasPerps = pack.orderBooks.some((b) => b.marketType === "perps" || b.market.startsWith("perps:")) || (pack.rewardIncentives?.multipliers.some((m) => m.marketType === "perps") ?? false);
  for (const term of STRUCTURE_TERMS) {
    const wave2 = WEALTH_TERMS.includes(term) || REWARD_TERMS.includes(term) || PERPS_TERMS.includes(term);
    // wave 2 terms are short ("nav", "roi", "perp"), so they need whole-word matches
    if (wave2 ? !wordBoundaryRe(term).test(norm) : !norm.includes(term)) continue;
    const bookTerm = BOOK_TERMS.includes(term);
    const flowTerm = FLOW_TERMS.includes(term);
    const indexTerm = INDEX_TERMS.includes(term);
    const wealthTerm = WEALTH_TERMS.includes(term);
    const rewardTerm = REWARD_TERMS.includes(term);
    const perpsTerm = PERPS_TERMS.includes(term);
    const generic = !bookTerm && !flowTerm && !indexTerm && !wealthTerm && !rewardTerm && !perpsTerm;
    if ((bookTerm && hasBooks) || (flowTerm && hasFlows) || (indexTerm && hasIndexes) || (wealthTerm && hasWealth) || (rewardTerm && hasRewards) || (perpsTerm && hasPerps) || generic) {
      refs.push(`term:${term.trim()}`);
    }
  }
  return uniq(refs);
}

function findContradictions(answer: string, pack: EvidencePack): string[] {
  const facts = packFacts(pack);
  const out: string[] = [];
  const upWords = "(rose|rising|up|gained|gain|increased|increase|higher|climbed|rallied|jumped|surged|positive)";
  const downWords = "(fell|falling|down|dropped|drop|decreased|decrease|lower|declined|slid|sank|plunged|negative)";
  for (const sentence of sentences(answer)) {
    const norm = normalise(sentence);
    for (const p of facts.priceDirections) {
      const mentions = norm.includes(p.asset.toLowerCase()) || norm.includes(normalise(p.name));
      if (!mentions || Math.abs(p.change) < 0.05) continue;
      const saysUp = new RegExp(`\\b(price|it|${p.asset.toLowerCase()})[a-z ]{0,20}\\b${upWords}\\b`).test(norm);
      const saysDown = new RegExp(`\\b(price|it|${p.asset.toLowerCase()})[a-z ]{0,20}\\b${downWords}\\b`).test(norm);
      if (p.change < 0 && saysUp && !saysDown) out.push(`says ${p.asset} price rose; the snapshot shows ${p.change.toFixed(2)}% over 24h`);
      if (p.change > 0 && saysDown && !saysUp) out.push(`says ${p.asset} price fell; the snapshot shows +${p.change.toFixed(2)}% over 24h`);
    }
    for (const f of facts.flowDirections) {
      if (!norm.includes("etf") && !norm.includes("flow")) continue;
      const saysInflow = /\b(net )?inflow/.test(norm) && !/\boutflow/.test(norm) && !/\b(no|not|negative) (net )?inflow/.test(norm);
      const saysOutflow = /\boutflow/.test(norm) && !/\binflow/.test(norm);
      if (f.latestFlow < 0 && saysInflow) out.push(`says ${f.asset} ETFs saw inflows; the latest point is a net outflow`);
      if (f.latestFlow > 0 && saysOutflow) out.push(`says ${f.asset} ETFs saw outflows; the latest point is a net inflow`);
    }
    for (const b of facts.bidShares) {
      if (!/(bid|ask|buy|sell)/.test(norm) || !/(heav|more|dominat|thicker|deeper|stack)/.test(norm)) continue;
      const saysBidsHeavier = /\b(bids?|buy(ers)?|bid side)\b[a-z ]{0,25}\b(heavier|more|dominat\w*|thicker|deeper|stacked)/.test(norm);
      const saysAsksHeavier = /\b(asks?|sell(ers)?|ask side|offers?)\b[a-z ]{0,25}\b(heavier|more|dominat\w*|thicker|deeper|stacked)/.test(norm);
      if (b.share < 0.45 && saysBidsHeavier && !saysAsksHeavier) out.push(`says bids dominate ${b.market}; bid share of depth is ${(b.share * 100).toFixed(1)}%`);
      if (b.share > 0.55 && saysAsksHeavier && !saysBidsHeavier) out.push(`says asks dominate ${b.market}; bid share of depth is ${(b.share * 100).toFixed(1)}%`);
    }
  }
  return uniq(out);
}

/** Misconception cue detection shared with the coach: word-boundary, negation-aware. */
export function detectMisconceptionCues(text: string, misconceptions: Misconception[]): Array<{ misconceptionId: string; cue: string }> {
  const hits: Array<{ misconceptionId: string; cue: string }> = [];
  for (const m of misconceptions) {
    for (const cue of m.cues) {
      if (matchPhraseUnnegated(text, cue)) {
        hits.push({ misconceptionId: m.id, cue });
        break;
      }
    }
  }
  return hits;
}

function keyPointCoverage(answer: string, keyPoints: string[]): { matched: string[]; partial: string[]; missing: string[]; credit: number } {
  const tokens = contentTokens(answer);
  const set = new Set(tokens);
  const matched: string[] = [];
  const partial: string[] = [];
  const missing: string[] = [];
  let credit = 0;
  for (const kp of keyPoints) {
    const cov = tokenCoverage(kp, set);
    const run = hasPhraseRun(kp, tokens, 3);
    if (cov >= 0.6 || run) {
      matched.push(kp);
      credit += 1;
    } else if (cov >= 0.35) {
      partial.push(kp);
      credit += 0.5;
    } else {
      missing.push(kp);
    }
  }
  return { matched, partial, missing, credit: keyPoints.length === 0 ? 0 : credit / keyPoints.length };
}

function isOffTopic(answer: string, scenario: Scenario): boolean {
  const words = wordCount(answer);
  if (words < 5) return true;
  const topic = new Set(
    contentTokens(
      [
        ...scenario.rubric.keyPoints,
        ...scenario.questions.map((q) => q.prompt),
        scenario.learningObjective,
        ...scenario.evidence.snapshots.map((s) => `${s.asset} ${s.name}`),
        ...scenario.evidence.orderBooks.map((b) => `${b.displayName} order book spread depth bid ask`),
        ...scenario.evidence.etfFlows.map((f) => `${f.asset} etf flow inflow outflow`),
        ...scenario.evidence.indexes.map((i) => `${i.name} index constituent weight`),
        ...(scenario.evidence.wealthFunds ?? []).map((f) => `${f.fundId} ${f.name} ${f.kindLabel} fund nav fee`),
        ...(scenario.evidence.wealthQuotes ?? []).map((q) => `${q.fundId} ${q.symbol ?? ""} fund price roi apy yield`),
        ...(scenario.evidence.dcaSimulations ?? []).map((d) => `${d.fundId} dca simulation return weekly`),
        ...(scenario.evidence.rewardIncentives ? ["rewards points multiplier volume maker taker box incentive"] : []),
        ...(scenario.evidence.rewardFeed ? ["reward feed win box"] : []),
        "portfolio weight diversification concentration",
        "market price volume liquidity news evidence data",
      ].join(" "),
    ),
  );
  const shared = uniq(contentTokens(answer)).filter((t) => topic.has(t)).length;
  return shared < 2;
}

function wordBoundaryRe(phrase: string): RegExp {
  const escaped = phrase.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`);
}

/** phrases (trimmed) that occur as whole words in the normalised text */
function findAll(text: string, phrases: string[]): string[] {
  const norm = normalise(text);
  return phrases.filter((p) => wordBoundaryRe(p).test(norm)).map((p) => p.trim());
}

function unsupportedCertainty(answer: string): string[] {
  const out: string[] = [];
  for (const sentence of sentences(answer)) {
    const certain = findAll(sentence, CERTAINTY);
    if (certain.length === 0) continue;
    const hedged = findAll(sentence, HEDGES).length > 0 || findAll(sentence, EXPLICIT_LIMITS).length > 0;
    if (!hedged) out.push(...certain);
  }
  return uniq(out);
}

export function evaluateWithRules(input: RulesInput): RulesEvaluation {
  const { scenario, answer } = input;
  const misconceptions = input.misconceptions ?? curriculum.misconceptions;
  const words = wordCount(answer);
  const offTopic = isOffTopic(answer, scenario);

  // factual
  const coverage = keyPointCoverage(answer, scenario.rubric.keyPoints);
  const contradictions = findContradictions(answer, scenario.evidence);
  let factual = offTopic ? 0 : 35 * coverage.credit;
  factual -= Math.min(10, contradictions.length * 5);

  // evidence
  const evidenceReferences = offTopic ? [] : findEvidenceReferences(answer, scenario.evidence, scenario.description);
  const distinctKinds = uniq(evidenceReferences.map((r) => r.split(":")[0])).length;
  const refCount = evidenceReferences.length;
  let evidence = refCount === 0 ? 0 : refCount === 1 ? 8 : refCount === 2 ? 14 : refCount === 3 ? 19 : 23;
  if (distinctKinds >= 3) evidence += 2;
  // concrete figures/news/dates are worth more than bare terms
  const concrete = evidenceReferences.filter((r) => /^(figure|news|date):/.test(r)).length;
  if (concrete === 0 && refCount > 0) evidence = Math.min(evidence, 12);

  // reasoning
  const connectors = uniq(findAll(answer, CONNECTORS));
  const hasObservation = findAll(answer, OBSERVATION_MARKERS).length > 0 || concrete > 0;
  const hasInterpretation = findAll(answer, INTERPRETATION_MARKERS).length > 0;
  const separates = hasObservation && hasInterpretation;
  const certainty = unsupportedCertainty(answer);
  const connectorPts = connectors.length === 0 ? 0 : connectors.length === 1 ? 8 : connectors.length === 2 ? 12 : 15;
  const lengthPts = words < 15 ? 0 : words < 25 ? 2 : words <= 400 ? 4 : 2;
  let reasoning = offTopic ? 0 : connectorPts + (separates ? 6 : 0) + lengthPts;
  reasoning -= Math.min(12, certainty.length * 4);

  // uncertainty
  const hedges = uniq(findAll(answer, HEDGES));
  const limits = uniq(findAll(answer, EXPLICIT_LIMITS));
  const hedgePts = hedges.length === 0 ? 0 : hedges.length === 1 ? 4 : hedges.length === 2 ? 7 : 8;
  const limitPts = limits.length === 0 ? 0 : limits.length === 1 ? 5 : 7;
  let uncertainty = offTopic ? 0 : hedgePts + limitPts;
  uncertainty -= certainty.length * 3;

  const cues = detectMisconceptionCues(answer, misconceptions);

  return {
    rubricScores: {
      factual: round(clamp(factual, 0, 35)),
      evidence: round(clamp(evidence, 0, 25)),
      reasoning: round(clamp(reasoning, 0, 25)),
      uncertainty: round(clamp(uncertainty, 0, 15)),
    },
    matchedKeyPoints: coverage.matched,
    partialKeyPoints: coverage.partial,
    missingKeyPoints: coverage.missing,
    evidenceReferences,
    contradictions,
    misconceptionIds: uniq(cues.map((c) => c.misconceptionId)),
    misconceptionCues: cues,
    reasoning: { connectors, separatesObservationFromInterpretation: separates, wordCount: words, unsupportedCertainty: certainty },
    uncertainty: { hedges, explicitLimits: limits },
    offTopic,
  };
}

export function sumScores(scores: RubricScores): number {
  return scores.factual + scores.evidence + scores.reasoning + scores.uncertainty;
}
