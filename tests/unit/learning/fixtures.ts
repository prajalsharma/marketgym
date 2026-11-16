/**
 * Shared fixtures for lib/ai and lib/learning tests: learner records, an
 * evidence pack, and OrderBookSnapshots normalised from the SoDEX fixtures.
 */
import type { KnowledgeCheckResult } from "@/lib/db/repository";
import { getExerciseTemplate } from "@/lib/curriculum";
import type { Evaluation, MasteryRecord, Profile, Review, Scenario, ScenarioAttempt } from "@/lib/types/learning";
import type { DataProvenance, EvidencePack, OrderBookLevel, OrderBookSnapshot } from "@/lib/types/market";
import type { LearningMemory } from "@/lib/learning/memory";
import { buildScenario, makeScenarioId } from "@/lib/learning/scenario-generator";
import type { LanguageModel, StructuredRequest } from "@/lib/ai/provider";
import btcRaw from "@/lib/market-data/__fixtures__/sodex/mainnet-spot-orderbook-vBTC_vUSDC.json";
import ethRaw from "@/lib/market-data/__fixtures__/sodex/mainnet-spot-orderbook-vETH_vUSDC.json";

export const NOW = new Date("2026-11-06T12:00:00.000Z");

export function iso(daysFromNow: number, hours = 0): string {
  return new Date(NOW.getTime() + daysFromNow * 86_400_000 + hours * 3_600_000).toISOString();
}

export const demoProvenance: DataProvenance = {
  kind: "demo",
  provider: "fixture",
  sourceUrl: "fixture://sodex",
  fetchedAt: "2026-11-06T05:42:24.000Z",
};

interface RawBook {
  data: { blockTime: number; bids: string[][]; asks: string[][] };
}

function levels(rows: string[][]): OrderBookLevel[] {
  let cum = 0;
  return rows.map(([p, q]) => {
    const quantity = Number(q);
    cum += quantity;
    return { price: Number(p), quantity, cumulativeQuantity: Number(cum.toFixed(8)) };
  });
}

export function bookFromFixture(raw: RawBook, opts: { market: string; displayName: string; base: string; tickSize: number; lotSize: number }): OrderBookSnapshot {
  const bids = levels(raw.data.bids);
  const asks = levels(raw.data.asks);
  const bestBid = bids[0]?.price ?? null;
  const bestAsk = asks[0]?.price ?? null;
  const mid = bestBid !== null && bestAsk !== null ? (bestBid + bestAsk) / 2 : null;
  const spread = bestBid !== null && bestAsk !== null ? bestAsk - bestBid : null;
  const bidQty = bids.reduce((s, l) => s + l.quantity, 0);
  const askQty = asks.reduce((s, l) => s + l.quantity, 0);
  return {
    market: opts.market,
    displayName: opts.displayName,
    baseAsset: opts.base,
    quoteAsset: "vUSDC",
    tickSize: opts.tickSize,
    lotSize: opts.lotSize,
    bids,
    asks,
    bestBid,
    bestAsk,
    midPrice: mid,
    spread,
    spreadPercentage: spread !== null && mid ? (spread / mid) * 100 : null,
    bidShareOfDepth: bidQty + askQty > 0 ? bidQty / (bidQty + askQty) : null,
    timestamp: new Date(raw.data.blockTime).toISOString(),
    provenance: demoProvenance,
  };
}

export const btcBook = bookFromFixture(btcRaw as RawBook, { market: "vBTC_vUSDC", displayName: "BTC/USDC", base: "vBTC", tickSize: 1, lotSize: 0.00001 });
export const ethBook = bookFromFixture(ethRaw as RawBook, { market: "vETH_vUSDC", displayName: "ETH/USDC", base: "vETH", tickSize: 0.1, lotSize: 0.0001 });

export function makePack(overrides: Partial<EvidencePack> = {}): EvidencePack {
  return {
    id: "pack-1",
    createdAt: NOW.toISOString(),
    snapshots: [
      { asset: "BTC", name: "Bitcoin", price: 75576, percentageChange24h: -1.2, volume24h: 32_100_000_000, marketCapitalisation: 1_500_000_000_000, timestamp: NOW.toISOString(), provenance: demoProvenance },
      { asset: "ETH", name: "Ethereum", price: 2223.3, percentageChange24h: 0.8, volume24h: 14_200_000_000, marketCapitalisation: 268_000_000_000, timestamp: NOW.toISOString(), provenance: demoProvenance },
    ],
    news: [
      { id: "n1", title: "Spot bitcoin ETFs record third day of outflows", summary: "Funds saw net redemptions again.", category: "etf", source: "CoinDesk", sourceUrl: "https://example.com/n1", publishedAt: "2026-11-05T09:00:00.000Z", fetchedAt: NOW.toISOString(), provenance: demoProvenance },
    ],
    etfFlows: [
      {
        asset: "BTC",
        points: [
          { date: "2026-11-03", netInflowUsd: -80_000_000, cumulativeNetInflowUsd: 40_000_000_000, totalNetAssetsUsd: 120_000_000_000, totalVolumeUsd: 2_000_000_000 },
          { date: "2026-11-04", netInflowUsd: -95_000_000, cumulativeNetInflowUsd: 39_905_000_000, totalNetAssetsUsd: 119_000_000_000, totalVolumeUsd: 2_100_000_000 },
          { date: "2026-11-05", netInflowUsd: -120_000_000, cumulativeNetInflowUsd: 39_785_000_000, totalNetAssetsUsd: 118_000_000_000, totalVolumeUsd: 2_300_000_000 },
        ],
        latest: { date: "2026-11-05", netInflowUsd: -120_000_000, cumulativeNetInflowUsd: 39_785_000_000, totalNetAssetsUsd: 118_000_000_000, totalVolumeUsd: 2_300_000_000 },
        provenance: demoProvenance,
      },
    ],
    indexes: [],
    orderBooks: [btcBook],
    ...overrides,
  };
}

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "user-1",
    displayName: "Test Learner",
    experienceLevel: "some",
    learningGoal: "read-market-data",
    preferredLearningStyle: "concise",
    interests: [],
    onboardingCompletedAt: NOW.toISOString(),
    createdAt: iso(-10),
    updatedAt: iso(-1),
    ...overrides,
  };
}

export function makeMemory(overrides: Partial<LearningMemory> = {}): LearningMemory {
  return { weakSkillIds: [], recurringMisconceptions: [], understoodSkillIds: [], preferredStyle: "concise", recentScores: [], ...overrides };
}

export function makeEvaluation(score: number, misconceptionIds: string[] = []): Evaluation {
  const f = Math.min(35, Math.round(score * 0.35));
  const e = Math.min(25, Math.round(score * 0.25));
  const r = Math.min(25, Math.round(score * 0.25));
  const u = score - f - e - r;
  return {
    totalScore: score,
    rubricScores: { factual: f, evidence: e, reasoning: r, uncertainty: u },
    correctReasoning: [],
    missingEvidence: [],
    misconceptionIds,
    explanation: "fixture",
    followUp: "fixture",
    recommendedReviewSkillIds: [],
    confidence: 0.6,
    evaluatorMode: "rules",
    promptVersion: "rules-v1",
  };
}

export function makeAttempt(input: { id: string; scenarioId: string; skillIds: string[]; score: number; misconceptionIds?: string[]; createdAt: string; hintsUsed?: number }): ScenarioAttempt {
  return {
    id: input.id,
    userId: "user-1",
    scenarioId: input.scenarioId,
    skillIds: input.skillIds,
    submittedAnswer: "fixture answer",
    hintsUsed: input.hintsUsed ?? 0,
    evaluation: makeEvaluation(input.score, input.misconceptionIds ?? []),
    createdAt: input.createdAt,
  };
}

export function makeKc(input: { id: string; skillId: string; correct: boolean; createdAt: string; misconceptionId?: string | null; reviewId?: string | null; knowledgeCheckId?: string }): KnowledgeCheckResult {
  return {
    id: input.id,
    userId: "user-1",
    skillId: input.skillId,
    knowledgeCheckId: input.knowledgeCheckId ?? `kc.${input.skillId}.1`,
    optionId: input.correct ? "b" : "a",
    correct: input.correct,
    misconceptionId: input.misconceptionId ?? null,
    reviewId: input.reviewId ?? null,
    createdAt: input.createdAt,
  };
}

export function makeReview(input: { id: string; skillId: string; scheduledAt: string; completedAt?: string | null; result?: "passed" | "failed" | null; attemptId?: string | null }): Review {
  return {
    id: input.id,
    userId: "user-1",
    skillId: input.skillId,
    scheduledAt: input.scheduledAt,
    completedAt: input.completedAt ?? null,
    result: input.result ?? null,
    attemptId: input.attemptId ?? null,
  };
}

export function makeMastery(input: { skillId: string; status: MasteryRecord["masteryStatus"]; score?: number; evidence?: MasteryRecord["evidence"]; nextReviewAt?: string | null }): MasteryRecord {
  return {
    userId: "user-1",
    skillId: input.skillId,
    masteryScore: input.score ?? (input.status === "mastered" ? 90 : input.status === "practising" ? 70 : input.status === "learning" ? 30 : 0),
    masteryStatus: input.status,
    evidenceCount: input.evidence?.length ?? 0,
    evidence: input.evidence ?? [],
    unresolvedMisconceptionIds: [],
    lastAssessedAt: input.status === "not-started" ? null : iso(-1),
    nextReviewAt: input.nextReviewAt ?? null,
    updatedAt: iso(-1),
  };
}

/** a real scenario built from a curriculum template and the fixture pack */
export function makeScenario(templateId = "ex.markets.describe-snapshot", pack: EvidencePack = makePack()): Scenario {
  const template = getExerciseTemplate(templateId);
  if (!template) throw new Error(`fixture: unknown template ${templateId}`);
  return buildScenario(template, pack, makeScenarioId(template.id, pack.id));
}

/** fake LanguageModel that returns the given replies in order (strings or objects); records requests */
export function fakeModel(replies: Array<string | object>, opts: { delayMs?: number; name?: string } = {}): LanguageModel & { requests: StructuredRequest[] } {
  const queue = [...replies];
  const requests: StructuredRequest[] = [];
  return {
    name: opts.name ?? "fake-model",
    requests,
    async generateJson(request: StructuredRequest): Promise<string> {
      requests.push(request);
      if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
      const next = queue.shift();
      if (next === undefined) throw new Error("fake model: no reply queued");
      return typeof next === "string" ? next : JSON.stringify(next);
    },
  };
}
