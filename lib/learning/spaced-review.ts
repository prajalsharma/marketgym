/**
 * Spaced retention reviews. Intervals grow 1d → 3d → 7d → 14d with each passed
 * review for a skill; a failed review resets to 1d. A review is only created
 * once mastery is at least "practising" and no review is pending for the skill.
 */
import type { MasteryRecord, Review } from "@/lib/types/learning";

export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

/** days until the next review given how many reviews the learner has passed in a row */
export function reviewIntervalDays(passedCount: number, lastFailed: boolean): number {
  if (lastFailed) return REVIEW_INTERVALS_DAYS[0];
  const idx = Math.min(Math.max(passedCount, 0), REVIEW_INTERVALS_DAYS.length - 1);
  return REVIEW_INTERVALS_DAYS[idx];
}

/** completed reviews for the skill, most recent first */
function completedReviews(reviews: Review[], skillId: string): Review[] {
  return reviews
    .filter((r) => r.skillId === skillId && r.completedAt !== null)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
}

/** passed reviews since the last failure (the streak that sets the interval) */
export function passedStreak(reviews: Review[], skillId: string): { passed: number; lastFailed: boolean } {
  const done = completedReviews(reviews, skillId);
  if (done.length === 0) return { passed: 0, lastFailed: false };
  if (done[0].result === "failed") return { passed: 0, lastFailed: true };
  let passed = 0;
  for (const r of done) {
    if (r.result === "passed") passed += 1;
    else break;
  }
  return { passed, lastFailed: false };
}

/**
 * When the next review should happen for a skill, or null when the learner is
 * not yet practising. Pending reviews keep their scheduled date. Otherwise the
 * interval is counted from the last assessment (or now).
 */
export function computeNextReviewAt(
  record: Pick<MasteryRecord, "skillId" | "masteryStatus" | "lastAssessedAt">,
  reviews: Review[],
  now: Date,
): string | null {
  if (record.masteryStatus !== "practising" && record.masteryStatus !== "mastered") return null;
  const pending = reviews
    .filter((r) => r.skillId === record.skillId && r.completedAt === null)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0];
  if (pending) return pending.scheduledAt;
  const { passed, lastFailed } = passedStreak(reviews, record.skillId);
  const base = record.lastAssessedAt ? new Date(record.lastAssessedAt) : now;
  const from = Number.isNaN(base.getTime()) ? now : base;
  return new Date(from.getTime() + reviewIntervalDays(passed, lastFailed) * DAY_MS).toISOString();
}

/**
 * Returns a new pending Review when one should be created: mastery ≥ practising
 * and no pending review for the skill in `existing`. Pass the learner's reviews
 * for the skill as `existing` (defaults to none).
 */
export function scheduleReview(record: MasteryRecord, now: Date, existing: Review[] = []): Review | null {
  if (record.masteryStatus !== "practising" && record.masteryStatus !== "mastered") return null;
  const hasPending = existing.some((r) => r.skillId === record.skillId && r.completedAt === null);
  if (hasPending) return null;
  const scheduledAt = record.nextReviewAt ?? computeNextReviewAt(record, existing, now);
  if (!scheduledAt) return null;
  return {
    id: `review_${record.skillId.replace(/[^a-z0-9.-]/gi, "")}_${new Date(scheduledAt).getTime()}`,
    userId: record.userId,
    skillId: record.skillId,
    scheduledAt,
    completedAt: null,
    result: null,
    attemptId: null,
  };
}
