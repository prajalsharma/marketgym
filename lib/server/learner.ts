/**
 * Shared orchestration for route handlers: learner state loading, mastery
 * recomputation from ALL stored records (never from the client), review
 * scheduling, activity logging and next-mission selection.
 */
import type { KnowledgeCheckResult, Repository } from "@/lib/db";
import { computeMastery } from "@/lib/learning/mastery";
import { buildMemory, type LearningMemory } from "@/lib/learning/memory";
import { scheduleReview } from "@/lib/learning/spaced-review";
import { selectNextMission } from "@/lib/learning/curriculum-engine";
import type { ActivityEvent, ActivityKind, DiagnosticResult, MasteryRecord, NextMission, Profile, Review, ScenarioAttempt } from "@/lib/types";
import type { AuthUser } from "@/lib/auth/session";
import { newId } from "./api";

export interface LearnerState {
  profile: Profile;
  diagnostic: DiagnosticResult | null;
  mastery: MasteryRecord[];
  reviews: Review[];
  attempts: ScenarioAttempt[];
  kcResults: KnowledgeCheckResult[];
  memory: LearningMemory;
}

export function defaultProfile(user: AuthUser, now = new Date()): Profile {
  const iso = now.toISOString();
  return {
    id: user.id,
    displayName: user.email ? user.email.split("@")[0]! : "Learner",
    experienceLevel: "new",
    learningGoal: "read-market-data",
    preferredLearningStyle: "concise",
    interests: [],
    onboardingCompletedAt: null,
    createdAt: iso,
    updatedAt: iso,
  };
}

/** Profile for the learner, created on first visit when missing. */
export async function ensureProfile(repo: Repository, user: AuthUser): Promise<Profile> {
  const existing = await repo.getProfile(user.id);
  if (existing) return existing;
  return repo.upsertProfile(defaultProfile(user));
}

export async function loadLearnerState(repo: Repository, user: AuthUser): Promise<LearnerState> {
  const profile = await ensureProfile(repo, user);
  const [diagnostic, mastery, reviews, attempts, kcResults] = await Promise.all([
    repo.getLatestDiagnostic(user.id),
    repo.listMastery(user.id),
    repo.listReviews(user.id),
    repo.listAttempts(user.id),
    repo.listKnowledgeCheckResults(user.id),
  ]);
  const memory = buildMemory({ profile, mastery, attempts, kcResults });
  return { profile, diagnostic, mastery, reviews, attempts, kcResults, memory };
}

export function nextMissionFor(state: LearnerState): NextMission {
  return selectNextMission({
    profile: state.profile,
    diagnostic: state.diagnostic,
    mastery: state.mastery,
    reviews: state.reviews,
    attempts: state.attempts,
    kcResults: state.kcResults,
  });
}

/**
 * Recompute mastery for the given skills from every stored record, upsert,
 * and create a pending review when the scheduler asks for one. Returns the
 * updated records.
 */
export async function recomputeMastery(repo: Repository, userId: string, skillIds: string[], now = new Date()): Promise<MasteryRecord[]> {
  const unique = [...new Set(skillIds)];
  if (unique.length === 0) return [];
  const [attempts, kcResults, reviews] = await Promise.all([repo.listAttempts(userId), repo.listKnowledgeCheckResults(userId), repo.listReviews(userId)]);
  const updates: MasteryRecord[] = [];
  for (const skillId of unique) {
    const previous = await repo.getMastery(userId, skillId);
    const record = computeMastery({
      userId,
      skillId,
      attempts: attempts.filter((a) => a.skillIds.includes(skillId)),
      kcResults: kcResults.filter((k) => k.skillId === skillId),
      reviews: reviews.filter((r) => r.skillId === skillId),
      now,
      previous,
    });
    const saved = await repo.upsertMastery(record);
    updates.push(saved);
    const skillReviews = reviews.filter((r) => r.skillId === skillId);
    const review = scheduleReview(saved, now, skillReviews);
    if (review) {
      // ids are UUIDs so the same record round-trips through Postgres and the local store
      await repo.saveReview({ ...review, id: newId(), userId });
    }
  }
  return updates;
}

export async function logActivity(
  repo: Repository,
  userId: string,
  input: { kind: ActivityKind; skillIds: string[]; summary: string; score?: number; refId?: string },
  now = new Date(),
): Promise<ActivityEvent> {
  return repo.logActivity({
    id: newId(),
    userId,
    kind: input.kind,
    skillIds: input.skillIds,
    summary: input.summary,
    ...(input.score !== undefined ? { score: Math.round(input.score) } : {}),
    ...(input.refId ? { refId: input.refId } : {}),
    createdAt: now.toISOString(),
  });
}

/** Consecutive UTC days (ending today or yesterday) with at least one activity event. */
export function computeStreakDays(events: Array<{ createdAt: string }>, now = new Date()): number {
  const days = new Set(events.map((e) => e.createdAt.slice(0, 10)));
  if (days.size === 0) return 0;
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const today = cursor.toISOString().slice(0, 10);
  if (!days.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
