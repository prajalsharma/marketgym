import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { LearningPathResponse, ProgressOverviewResponse } from "@/lib/types/api";
import { Card, CardContent, CardHeader, CardTitle, MasteryIndicator, Progress, Stat } from "@/components/ui";
import { NextMissionCard } from "@/components/platform/next-mission-card";
import { ActivityList, ReviewList } from "@/components/platform/activity-list";
import { RetryError } from "@/components/shared/retry-error";
import { load } from "@/lib/client/server-api";
import { describeError } from "@/lib/client/api";
import { firstName } from "@/lib/client/profile";
import { goalLabel } from "@/lib/client/labels";
import { humanise } from "@/lib/client/format";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const [overview, path] = await Promise.all([
    load<ProgressOverviewResponse>("/api/progress/overview"),
    load<LearningPathResponse>("/api/learning/path"),
  ]);

  if (!overview.ok) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <RetryError title="Could not load your overview" description={describeError(overview.error)} />
      </div>
    );
  }

  const o = overview.data;
  if (!o.profile.onboardingCompletedAt) redirect("/app/onboarding");

  const skillNames: Record<string, string> = {};
  for (const s of o.skills) skillNames[s.skill.id] = s.skill.name;
  const modules = path.ok ? path.data.modules : null;
  const masteredShare = o.totalSkills > 0 ? Math.round((o.masteredCount / o.totalSkills) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Hello, {firstName(o.profile)}</h1>
        <p className="mt-1 text-sm text-muted">
          Goal: {goalLabel(o.profile.learningGoal)} · {o.masteredCount} of {o.totalSkills} skills mastered
          {o.streakDays > 0 ? ` · ${o.streakDays}-day streak` : ""}
        </p>
      </div>

      <NextMissionCard mission={o.nextMission} skillName={skillNames[o.nextMission.skillId]} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="This week" value={o.weekly.attempts} hint={o.weekly.attempts === 1 ? "attempt" : "attempts"} />
        <Stat
          label="Average score"
          value={o.weekly.averageScore === null ? "—" : Math.round(o.weekly.averageScore)}
          hint={o.weekly.averageScore === null ? "no graded work yet" : "out of 100, this week"}
        />
        <Stat label="Skills improved" value={o.weekly.skillsImproved} hint="this week" />
        <Stat label="Time practised" value={`${o.weekly.minutesEstimate} min`} hint="estimate, this week" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-baseline justify-between">
              <CardTitle>Your track</CardTitle>
              <Link href="/app/learn" className="text-sm text-accent underline-offset-4 hover:underline">
                Open learning path
              </Link>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex items-baseline justify-between text-sm">
                  <span>{path.ok ? path.data.curriculum.path.title : "Crypto market analyst foundations"}</span>
                  <span className="font-mono text-xs tabular-nums text-muted">{masteredShare}% mastered</span>
                </div>
                <Progress value={masteredShare} className="mt-1.5" aria-label="Share of skills mastered" />
              </div>
              {modules ? (
                <ul className="divide-y divide-line">
                  {modules.map(({ module, unlocked, progress }) => (
                    <li key={module.id} className="flex items-center gap-3 py-2.5 text-sm">
                      <span className="w-6 shrink-0 font-mono text-xs tabular-nums text-subtle">{module.sequence}</span>
                      <Link
                        href={`/app/learn/${encodeURIComponent(module.id)}`}
                        className="min-w-0 flex-1 truncate underline-offset-4 hover:underline"
                      >
                        {module.title}
                      </Link>
                      {!unlocked ? <span className="text-xs text-muted">Locked</span> : null}
                      <Progress value={Math.round(progress * 100)} className="w-24" aria-label={`${module.title} progress`} />
                      <span className="w-9 text-right font-mono text-xs tabular-nums text-muted">
                        {Math.round(progress * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">
                  Module progress is unavailable right now{path.ok ? "" : `: ${describeError(path.error)}`}.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityList events={o.recentActivity.slice(0, 8)} skillNames={skillNames} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Weakest right now</CardTitle>
            </CardHeader>
            <CardContent>
              {o.weakestSkills.length === 0 ? (
                <p className="text-sm text-muted">No weak spots found yet. Do a scenario and the coach will find some.</p>
              ) : (
                <ul className="space-y-3">
                  {o.weakestSkills.map((w) => {
                    const status = o.skills.find((s) => s.skill.id === w.skillId)?.mastery?.masteryStatus ?? "not-started";
                    return (
                      <li key={w.skillId} className="text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <Link href={`/app/coach?skill=${encodeURIComponent(w.skillId)}`} className="underline-offset-4 hover:underline">
                            {skillNames[w.skillId] ?? humanise(w.skillId)}
                          </Link>
                          <MasteryIndicator status={status} score={w.masteryScore} size="sm" hideLabel />
                        </div>
                        <p className="mt-0.5 text-xs text-muted">{w.reason}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <ReviewList reviews={o.upcomingReviews.slice(0, 5)} skillNames={skillNames} />
            </CardContent>
          </Card>

          {o.recurringMisconceptions.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Ideas that keep coming back</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {o.recurringMisconceptions.slice(0, 5).map((m) => (
                    <li key={m.misconceptionId} className="flex items-baseline justify-between gap-3">
                      <span>{m.label || humanise(m.misconceptionId)}</span>
                      <span className="font-mono text-xs tabular-nums text-muted">×{m.count}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
