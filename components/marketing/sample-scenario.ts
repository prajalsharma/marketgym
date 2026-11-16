/**
 * A static, clearly-labelled sample scenario for the landing preview.
 * Numbers mirror the shape of the real fixtures; provenance is "demo" so the
 * DataSourceTag never shows it as live. Nothing here is used by the platform.
 */
import type { DataProvenance, EvidencePack } from "@/lib/types/market";
import type { Evaluation, Scenario } from "@/lib/types/learning";

const CAPTURED = "2026-11-06T05:42:24.000Z";

const demo = (provider: DataProvenance["provider"], sourceUrl: string): DataProvenance => ({
  kind: "demo",
  provider,
  sourceUrl,
  fetchedAt: CAPTURED,
  note: "Sample captured for the product preview.",
});

const flowDays = [
  ["2026-10-21", 184_300_000],
  ["2026-10-22", 92_100_000],
  ["2026-10-23", -41_700_000],
  ["2026-10-24", 215_900_000],
  ["2026-10-27", 301_200_000],
  ["2026-10-28", 126_400_000],
  ["2026-10-29", -88_500_000],
  ["2026-10-30", -132_000_000],
  ["2026-10-31", 54_800_000],
  ["2026-11-03", 240_600_000],
  ["2026-11-04", 171_300_000],
  ["2026-11-05", -63_900_000],
] as const;

let cumulative = 38_920_000_000;
const points = flowDays.map(([date, net]) => {
  cumulative += net;
  return {
    date,
    netInflowUsd: net,
    cumulativeNetInflowUsd: cumulative,
    totalNetAssetsUsd: 121_400_000_000 + (cumulative - 38_920_000_000) * 1.6,
    totalVolumeUsd: 2_900_000_000,
  };
});

export const SAMPLE_PACK: EvidencePack = {
  id: "sample-pack",
  createdAt: CAPTURED,
  snapshots: [
    {
      asset: "BTC",
      name: "Bitcoin",
      price: 75_576,
      percentageChange24h: -2.14,
      volume24h: 41_300_000_000,
      marketCapitalisation: 1_497_000_000_000,
      timestamp: CAPTURED,
      provenance: demo("sosovalue", "https://openapi.sosovalue.com/openapi/v1/currencies"),
    },
  ],
  news: [
    {
      id: "sample-news-1",
      title: "Spot bitcoin ETFs post third day of net outflows this week",
      summary:
        "Issuer data shows combined net outflows of about $64m on Wednesday, following $132m and $89m the two days before. Inflows earlier in the week were larger in total.",
      category: "etf",
      source: "SoSoValue",
      sourceUrl: "https://sosovalue.com/assets/etf/us-btc-spot",
      publishedAt: "2026-11-06T01:10:00.000Z",
      fetchedAt: CAPTURED,
      provenance: demo("sosovalue", "https://openapi.sosovalue.com/openapi/v1/news"),
    },
    {
      id: "sample-news-2",
      title: "Analyst: outflows show institutions are 'losing conviction'",
      summary:
        "A newsletter writer argues three outflow days mean large holders are leaving. No holder-level data is cited; the claim rests on the flow totals alone.",
      category: "market",
      source: "Newsletter",
      sourceUrl: "https://sosovalue.com/research",
      publishedAt: "2026-11-05T22:30:00.000Z",
      fetchedAt: CAPTURED,
      provenance: demo("sosovalue", "https://openapi.sosovalue.com/openapi/v1/news"),
    },
  ],
  etfFlows: [
    {
      asset: "BTC",
      points,
      latest: points[points.length - 1],
      provenance: demo("sosovalue", "https://openapi.sosovalue.com/openapi/v1/etfs/history"),
    },
  ],
  indexes: [],
  orderBooks: [],
};

export const SAMPLE_SCENARIO: Scenario = {
  id: "sample-scenario",
  templateId: "etf.flows.sample",
  title: "Three days of ETF outflows: what can you actually say?",
  description:
    "A newsletter says institutions are losing conviction after three days of spot ETF outflows. Use the flow data and the price snapshot to decide what the evidence supports.",
  difficulty: 2,
  skillIds: ["etf.flows", "etf.flow-limits", "news.facts-vs-opinions"],
  learningObjective: "Separate what ETF flow numbers measure from what commentators infer from them.",
  evidence: SAMPLE_PACK,
  questions: [
    { id: "q1", prompt: "What do the last twelve days of net flows show, in plain numbers?" },
    { id: "q2", prompt: "Which parts of the newsletter claim are facts and which are interpretation?" },
    { id: "q3", prompt: "What evidence would you need before agreeing that holders are leaving?" },
  ],
  expectedReasoning: [
    "Net flows over the window are positive in total despite three outflow days.",
    "Outflows measure ETF share redemptions, not who is selling or why.",
    "The newsletter's conclusion needs holder-level or longer-horizon data.",
  ],
  rubric: {
    dimensions: [
      { key: "factual", label: "Factual accuracy", maxPoints: 35, criteria: ["Reads the flow totals correctly"] },
      { key: "evidence", label: "Use of evidence", maxPoints: 25, criteria: ["Cites specific days and amounts"] },
      { key: "reasoning", label: "Reasoning", maxPoints: 25, criteria: ["Separates measurement from inference"] },
      { key: "uncertainty", label: "Handling uncertainty", maxPoints: 15, criteria: ["Names missing data"] },
    ],
    keyPoints: ["net positive over the window", "redemptions are not holder intent", "three days is short"],
    acceptableAlternatives: ["Treating the price move as unrelated to flows"],
    commonMisconceptionIds: ["one-day-flow-is-trend", "flows-equal-price-impact"],
  },
  hints: [
    "Add up the twelve daily figures before you describe the trend.",
    "An outflow is a redemption of ETF shares. Ask who can see why shares were redeemed.",
    "Compare the size of the three outflow days with the two largest inflow days in the same window.",
  ],
  createdAt: CAPTURED,
};

export const SAMPLE_EVALUATION: Evaluation = {
  totalScore: 71,
  rubricScores: { factual: 28, evidence: 18, reasoning: 17, uncertainty: 8 },
  correctReasoning: [
    "You added the window and noticed net flows are positive overall.",
    "You separated the outflow figures (fact) from 'losing conviction' (interpretation).",
  ],
  missingEvidence: [
    "The 24h price change (−2.14%) was not mentioned; a reader might assume flows explain it.",
    "The size of the largest inflow day ($301m) compared with the outflow days.",
  ],
  misconceptionIds: ["one-day-flow-is-trend"],
  explanation:
    "A clear read of the numbers. The answer leaned on three outflow days as a trend without weighing them against the inflow days in the same window, and it did not say what data would settle the question.",
  followUp: "If the same three-day outflow pattern appeared with flat prices, would your reading change? Why?",
  recommendedReviewSkillIds: ["etf.flow-limits"],
  confidence: 0.8,
  evaluatorMode: "rules",
  promptVersion: "sample",
};

export const SAMPLE_MISCONCEPTIONS = {
  "one-day-flow-is-trend": {
    label: "A few days of flows make a trend",
    correction: "Flows are noisy day to day. Judge them over a window and against their own history before calling a trend.",
  },
  "flows-equal-price-impact": {
    label: "Flows explain the price move",
    correction: "ETF flows are one source of demand among many venues. Price can move without flows and flows without price.",
  },
};

export const SAMPLE_SKILL_NAMES: Record<string, string> = {
  "etf.flows": "Reading ETF flows",
  "etf.flow-limits": "What flows cannot tell you",
  "news.facts-vs-opinions": "Facts versus opinions",
};
