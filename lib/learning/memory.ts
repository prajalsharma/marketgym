/**
 * Learner memory, derived purely from stored records on every request.
 * Nothing here is persisted and no model is involved.
 */
import type { KnowledgeCheckResult } from "@/lib/db/repository";
import type { LearningStyle, MasteryRecord, Profile, ScenarioAttempt } from "@/lib/types/learning";

export interface LearningMemory {
  weakSkillIds: string[];
  recurringMisconceptions: Array<{ misconceptionId: string; count: number; lastSeenAt: string }>;
  understoodSkillIds: string[];
  preferredStyle: LearningStyle;
  recentScores: number[];
}

export const RECURRING_THRESHOLD = 2;

export interface MisconceptionOccurrence {
  misconceptionId: string;
  skillIds: string[];
  at: string;
}

/** every misconception sighting across attempts and knowledge checks, oldest first */
export function misconceptionOccurrences(attempts: ScenarioAttempt[], kcResults: KnowledgeCheckResult[]): MisconceptionOccurrence[] {
  const out: MisconceptionOccurrence[] = [];
  for (const a of attempts) {
    for (const id of a.evaluation.misconceptionIds) out.push({ misconceptionId: id, skillIds: a.skillIds, at: a.createdAt });
  }
  for (const k of kcResults) {
    if (k.misconceptionId) out.push({ misconceptionId: k.misconceptionId, skillIds: [k.skillId], at: k.createdAt });
  }
  return out.sort((x, y) => x.at.localeCompare(y.at));
}

export function recurringMisconceptions(
  attempts: ScenarioAttempt[],
  kcResults: KnowledgeCheckResult[],
): LearningMemory["recurringMisconceptions"] {
  const counts = new Map<string, { count: number; lastSeenAt: string }>();
  for (const o of misconceptionOccurrences(attempts, kcResults)) {
    const cur = counts.get(o.misconceptionId);
    if (cur) {
      cur.count += 1;
      if (o.at > cur.lastSeenAt) cur.lastSeenAt = o.at;
    } else counts.set(o.misconceptionId, { count: 1, lastSeenAt: o.at });
  }
  return Array.from(counts.entries())
    .filter(([, v]) => v.count >= RECURRING_THRESHOLD)
    .map(([misconceptionId, v]) => ({ misconceptionId, count: v.count, lastSeenAt: v.lastSeenAt }))
    .sort((a, b) => b.count - a.count || b.lastSeenAt.localeCompare(a.lastSeenAt));
}

export function buildMemory(input: {
  profile: Profile;
  mastery: MasteryRecord[];
  attempts: ScenarioAttempt[];
  kcResults: KnowledgeCheckResult[];
}): LearningMemory {
  const weakSkillIds = input.mastery
    .filter((m) => m.masteryStatus !== "not-started" && m.masteryStatus !== "mastered" && m.masteryScore < 60)
    .sort((a, b) => a.masteryScore - b.masteryScore)
    .map((m) => m.skillId);
  const understoodSkillIds = input.mastery
    .filter((m) => m.masteryStatus === "mastered" || (m.masteryStatus === "practising" && m.masteryScore >= 75))
    .map((m) => m.skillId);
  const recentScores = [...input.attempts]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-10)
    .map((a) => a.evaluation.totalScore);
  return {
    weakSkillIds,
    recurringMisconceptions: recurringMisconceptions(input.attempts, input.kcResults),
    understoodSkillIds,
    preferredStyle: input.profile.preferredLearningStyle,
    recentScores,
  };
}
