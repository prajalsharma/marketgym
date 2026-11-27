/** Learner-facing labels for enum-like ids in lib/types. Plain, short copy. */
import type { ExperienceLevel, LearningGoal, LearningStyle, MasteryStatus, NextMission } from "@/lib/types/learning";
import type { SkillCategory } from "@/lib/types/curriculum";

export const GOALS: Array<{ id: LearningGoal; label: string; hint: string }> = [
  { id: "understand-news", label: "Understand market news", hint: "Tell facts from takes when you read headlines." },
  { id: "read-market-data", label: "Read market data", hint: "Price, volume, liquidity and what they actually mean." },
  { id: "etf-and-indexes", label: "ETF flows and indexes", hint: "What flow and index numbers can and cannot tell you." },
  { id: "market-structure", label: "How markets work", hint: "Order books, spreads, depth and price formation." },
  { id: "analyst-career", label: "Work as an analyst", hint: "Build the full reasoning habit, end to end." },
];

export const EXPERIENCE: Array<{ id: ExperienceLevel; label: string; hint: string }> = [
  { id: "new", label: "New to this", hint: "I have not followed markets closely before." },
  { id: "some", label: "Some experience", hint: "I read market news or hold some assets." },
  { id: "experienced", label: "Experienced", hint: "I analyse markets regularly and want to sharpen my method." },
];

export const STYLES: Array<{ id: LearningStyle; label: string; hint: string }> = [
  { id: "concise", label: "Short and direct", hint: "Give me the point, then let me practise." },
  { id: "detailed", label: "Thorough", hint: "Explain the reasoning behind each idea." },
  { id: "examples", label: "Example-led", hint: "Show me real cases before the theory." },
];

export const CATEGORIES: Array<{ id: SkillCategory; label: string; hint: string }> = [
  { id: "markets", label: "Market data", hint: "Price, volume, market cap, liquidity" },
  { id: "news", label: "News", hint: "Facts, catalysts, narratives" },
  { id: "etf", label: "ETF flows", hint: "Inflows, outflows, assets" },
  { id: "indexes", label: "Indexes", hint: "Constituents, weights, concentration" },
  { id: "orderbook", label: "Order books", hint: "Bids, asks, spread, depth" },
  { id: "reasoning", label: "Reasoning", hint: "Thesis, evidence, uncertainty" },
];

/** Labels for categories that exist in the curriculum but are not onboarding interests. */
const EXTRA_CATEGORY_LABEL: Record<string, string> = { wealth: "Funds, yield and incentives" };

export function categoryLabel(id: string): string {
  const known = CATEGORIES.find((c) => c.id === id)?.label ?? EXTRA_CATEGORY_LABEL[id];
  if (known) return known;
  // Sentence case for anything new, so a raw id never shows as "wealth".
  return id.charAt(0).toUpperCase() + id.slice(1).replace(/[-_.]/g, " ");
}

export function goalLabel(id: LearningGoal): string {
  return GOALS.find((g) => g.id === id)?.label ?? id;
}

export const MASTERY_LABEL: Record<MasteryStatus, string> = {
  "not-started": "Not started",
  learning: "Learning",
  practising: "Practising",
  mastered: "Mastered",
};

export const MISSION_KIND_LABEL: Record<NextMission["kind"], string> = {
  diagnostic: "Diagnostic",
  lesson: "Lesson",
  scenario: "Scenario",
  orderbook: "Order book exercise",
  review: "Review",
};

export const ACTIVITY_LABEL: Record<string, string> = {
  diagnostic: "Diagnostic",
  lesson: "Lesson",
  "knowledge-check": "Knowledge check",
  scenario: "Scenario",
  orderbook: "Order book",
  review: "Review",
  coach: "Coach",
};

export const RUBRIC_LABEL: Record<string, string> = {
  factual: "Factual accuracy",
  evidence: "Use of evidence",
  reasoning: "Reasoning",
  uncertainty: "Handling uncertainty",
};

export const DIFFICULTY_LABEL: Record<number, string> = {
  1: "Starter",
  2: "Easy",
  3: "Medium",
  4: "Hard",
  5: "Expert",
};

export const PROVIDER_LABEL: Record<string, string> = {
  sosovalue: "SoSoValue",
  sodex: "SoDEX",
  "sodex-wealth": "SoDEX Wealth",
  "sodex-rewards": "SoDEX Rewards",
  fixture: "Sample data",
};
