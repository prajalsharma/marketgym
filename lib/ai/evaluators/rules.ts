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
];

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

function findEvidenceReferences(answer: string, pack: EvidencePack): string[] {
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
  for (const n of numbers) {
    const hit = facts.figures.find((f) => f.value !== 0 && approxEqual(n, f.value, 0.01));
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
  const hasFlows = pack.etfFlows.length > 0;
  const hasIndexes = pack.indexes.length > 0;
  for (const term of STRUCTURE_TERMS) {
    if (!norm.includes(term)) continue;
    const bookTerm = ["spread", "depth", "bid", "ask", "order book", "orderbook", "imbalance", "tick", "lot size", "best bid", "best ask", "mid price", "cumulative"].includes(term);
    const flowTerm = ["inflow", "outflow", "net flow", "flows", "aum", "net assets"].includes(term);
    const indexTerm = ["constituent", "weight", "weighting", "concentration"].includes(term);
    if ((bookTerm && hasBooks) || (flowTerm && hasFlows) || (indexTerm && hasIndexes) || (!bookTerm && !flowTerm && !indexTerm)) {
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
  const evidenceReferences = offTopic ? [] : findEvidenceReferences(answer, scenario.evidence);
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
