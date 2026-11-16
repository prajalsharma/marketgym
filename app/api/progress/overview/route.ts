import { requireUser } from "@/lib/auth/session";
import { curriculum, getMisconception } from "@/lib/curriculum";
import { getRepository } from "@/lib/db";
import { computeSkillProgress } from "@/lib/learning/curriculum-engine";
import { handle, ok } from "@/lib/server/api";
import { computeStreakDays, loadLearnerState, nextMissionFor } from "@/lib/server/learner";
import type { ProgressOverviewResponse } from "@/lib/types";

const WEEK_MS = 7 * 24 * 60 * 60_000;
const MINUTES_PER_ATTEMPT = 8;
const MINUTES_PER_OTHER_ACTIVITY = 3;

export const GET = handle(async () => {
  const user = await requireUser();
  const repo = await getRepository();
  const state = await loadLearnerState(repo, user);
  const now = new Date();
  const [recentActivity, allActivity, pendingReviews] = await Promise.all([
    repo.listActivity(user.id, 20),
    repo.listActivity(user.id, 1000),
    repo.listReviews(user.id, { pending: true }),
  ]);

  const skills = computeSkillProgress(state.mastery);
  const weakest = state.memory.weakSkillIds
    .map((skillId) => {
      const m = state.mastery.find((r) => r.skillId === skillId);
      const unresolved = m?.unresolvedMisconceptionIds.length ?? 0;
      const reason =
        unresolved > 0
          ? `${unresolved} unresolved misconception${unresolved === 1 ? "" : "s"}`
          : m
            ? `mastery ${Math.round(m.masteryScore)}/100 after ${m.evidenceCount} piece${m.evidenceCount === 1 ? "" : "s"} of evidence`
            : "no evidence yet";
      return { skillId, masteryScore: m?.masteryScore ?? 0, reason };
    })
    .slice(0, 5);

  const recurringMisconceptions = state.memory.recurringMisconceptions.map((r) => ({
    misconceptionId: r.misconceptionId,
    label: getMisconception(r.misconceptionId)?.label ?? r.misconceptionId,
    count: r.count,
    lastSeenAt: r.lastSeenAt,
  }));

  const since = now.getTime() - WEEK_MS;
  const weekAttempts = state.attempts.filter((a) => Date.parse(a.createdAt) >= since);
  const weekActivity = allActivity.filter((a) => Date.parse(a.createdAt) >= since);
  const averageScore = weekAttempts.length > 0 ? Math.round(weekAttempts.reduce((s, a) => s + a.evaluation.totalScore, 0) / weekAttempts.length) : null;
  const skillsImproved = new Set(
    state.mastery.filter((m) => Date.parse(m.updatedAt) >= since && m.masteryStatus !== "not-started").map((m) => m.skillId),
  ).size;
  const otherActivity = weekActivity.filter((a) => a.kind !== "scenario").length;
  const minutesEstimate = weekAttempts.length * MINUTES_PER_ATTEMPT + otherActivity * MINUTES_PER_OTHER_ACTIVITY;

  return ok<ProgressOverviewResponse>({
    profile: state.profile,
    nextMission: nextMissionFor(state),
    skills,
    weakestSkills: weakest,
    recurringMisconceptions,
    upcomingReviews: pendingReviews.slice(0, 10),
    recentActivity,
    streakDays: computeStreakDays(allActivity, now),
    weekly: { attempts: weekAttempts.length, averageScore, skillsImproved, minutesEstimate },
    masteredCount: state.mastery.filter((m) => m.masteryStatus === "mastered").length,
    totalSkills: curriculum.skills.length,
  });
});
