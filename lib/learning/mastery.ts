/**
 * The ONLY producer of MasteryRecord. Pure function of stored attempts,
 * knowledge-check results and reviews; the LLM never touches this.
 *
 * Rule (docs/ARCHITECTURE.md):
 *  - mastered   = ≥2 scenario attempts on DIFFERENT scenarios scoring ≥80,
 *                 one passed retention review scheduled ≥1 day after the second
 *                 qualifying attempt, and no unresolved critical misconception
 *  - practising = ≥1 attempt ≥60 or ≥2 correct knowledge checks
 *  - learning   = any activity
 *  - not-started otherwise
 * masteryScore = 60 % best-two-scenario average + 25 % knowledge-check accuracy
 *                + 15 % review pass rate.
 */
import type { KnowledgeCheckResult } from "@/lib/db/repository";
import { getMisconception } from "@/lib/curriculum";
import type { MasteryEvidence, MasteryRecord, MasteryStatus, Review, ScenarioAttempt } from "@/lib/types/learning";
import { computeNextReviewAt } from "./spaced-review";

export const MASTERY_SCENARIO_THRESHOLD = 80;
export const PRACTISING_SCENARIO_THRESHOLD = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ComputeMasteryInput {
  userId: string;
  skillId: string;
  attempts: ScenarioAttempt[];
  kcResults: KnowledgeCheckResult[];
  reviews: Review[];
  now: Date;
  previous: MasteryRecord | null;
}

function byCreatedAt<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** best attempt per distinct scenario, highest first */
export function bestPerScenario(attempts: ScenarioAttempt[]): ScenarioAttempt[] {
  const best = new Map<string, ScenarioAttempt>();
  for (const a of attempts) {
    const cur = best.get(a.scenarioId);
    if (!cur || a.evaluation.totalScore > cur.evaluation.totalScore) best.set(a.scenarioId, a);
  }
  return Array.from(best.values()).sort((a, b) => b.evaluation.totalScore - a.evaluation.totalScore);
}

/**
 * Critical misconceptions seen in the last three attempts for the skill that
 * have not been followed by an attempt without them.
 */
export function unresolvedCriticalMisconceptions(attempts: ScenarioAttempt[]): string[] {
  const ordered = byCreatedAt(attempts);
  const lastThree = ordered.slice(-3);
  const seen = new Set<string>();
  for (const a of lastThree) for (const id of a.evaluation.misconceptionIds) seen.add(id);
  const out: string[] = [];
  for (const id of seen) {
    const m = getMisconception(id);
    if (!m || !m.critical) continue;
    const lastIdx = ordered.map((a) => a.evaluation.misconceptionIds.includes(id)).lastIndexOf(true);
    const resolved = ordered.slice(lastIdx + 1).some((a) => !a.evaluation.misconceptionIds.includes(id));
    if (!resolved) out.push(id);
  }
  return out.sort();
}

/**
 * Evidence ordering rule: chronological by `at` (oldest first). The sort is
 * stable, so records with the same timestamp keep the insertion order
 * scenario attempts → knowledge checks → completed reviews.
 */
function buildEvidence(attempts: ScenarioAttempt[], kcResults: KnowledgeCheckResult[], reviews: Review[]): MasteryEvidence[] {
  const evidence: MasteryEvidence[] = [];
  const seen = new Set<string>();
  for (const a of attempts) {
    evidence.push({ attemptId: a.id, score: a.evaluation.totalScore, at: a.createdAt, kind: "scenario" });
    seen.add(a.id);
  }
  for (const k of kcResults) {
    evidence.push({ attemptId: k.id, score: k.correct ? 100 : 0, at: k.createdAt, kind: k.reviewId ? "retention-check" : "knowledge-check" });
    seen.add(k.id);
  }
  for (const r of reviews) {
    if (r.completedAt === null || r.result === null) continue;
    const id = r.attemptId ?? r.id;
    if (seen.has(id)) continue;
    evidence.push({ attemptId: id, score: r.result === "passed" ? 100 : 0, at: r.completedAt, kind: "retention-check" });
  }
  return evidence.sort((a, b) => a.at.localeCompare(b.at));
}

export function computeMastery(input: ComputeMasteryInput): MasteryRecord {
  const attempts = byCreatedAt(input.attempts.filter((a) => a.skillIds.includes(input.skillId)));
  const kcResults = byCreatedAt(input.kcResults.filter((k) => k.skillId === input.skillId));
  const reviews = input.reviews.filter((r) => r.skillId === input.skillId);
  const completedReviews = reviews.filter((r) => r.completedAt !== null && r.result !== null);
  const plainChecks = kcResults.filter((k) => !k.reviewId);

  const evidence = buildEvidence(attempts, kcResults, reviews);
  const unresolved = unresolvedCriticalMisconceptions(attempts);

  // status
  const best = bestPerScenario(attempts);
  const qualifying = byCreatedAt(best.filter((a) => a.evaluation.totalScore >= MASTERY_SCENARIO_THRESHOLD));
  const correctChecks = plainChecks.filter((k) => k.correct).length;
  const hasPractisingAttempt = attempts.some((a) => a.evaluation.totalScore >= PRACTISING_SCENARIO_THRESHOLD);

  let status: MasteryStatus = evidence.length > 0 ? "learning" : "not-started";
  if (hasPractisingAttempt || correctChecks >= 2) status = "practising";
  if (qualifying.length >= 2 && unresolved.length === 0) {
    const secondAt = new Date(qualifying[1].createdAt).getTime();
    const passedLater = completedReviews.some(
      (r) => r.result === "passed" && new Date(r.scheduledAt).getTime() >= secondAt + DAY_MS,
    );
    if (passedLater) status = "mastered";
  }

  // score
  const topTwo = best.slice(0, 2);
  const scenarioComponent = topTwo.length === 0 ? 0 : topTwo.reduce((s, a) => s + a.evaluation.totalScore, 0) / topTwo.length;
  const kcComponent = plainChecks.length === 0 ? 0 : (correctChecks / plainChecks.length) * 100;
  const reviewComponent =
    completedReviews.length === 0 ? 0 : (completedReviews.filter((r) => r.result === "passed").length / completedReviews.length) * 100;
  const masteryScore = Math.round(0.6 * scenarioComponent + 0.25 * kcComponent + 0.15 * reviewComponent);

  const lastAssessedAt = evidence.length > 0 ? evidence[evidence.length - 1].at : null;
  const nowIso = input.now.toISOString();
  const partial = { skillId: input.skillId, masteryStatus: status, lastAssessedAt };

  return {
    userId: input.userId,
    skillId: input.skillId,
    masteryScore,
    masteryStatus: status,
    evidenceCount: evidence.length,
    evidence,
    unresolvedMisconceptionIds: unresolved,
    lastAssessedAt,
    nextReviewAt: computeNextReviewAt(partial, reviews, input.now),
    updatedAt: nowIso,
  };
}
