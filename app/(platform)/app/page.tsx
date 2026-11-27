import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { LearningPathResponse, ProgressOverviewResponse } from "@/lib/types/api";
import { Check, ChevronRight, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, MasteryIndicator } from "@/components/ui";
import { NextMissionCard } from "@/components/platform/next-mission-card";
import { ActivityList, ReviewList } from "@/components/platform/activity-list";
import { RetryError } from "@/components/shared/retry-error";
import { load } from "@/lib/client/server-api";
import { describeError } from "@/lib/client/api";
import { firstName } from "@/lib/client/profile";
import { goalLabel } from "@/lib/client/labels";
import { humanise } from "@/lib/client/format";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { GrowBar, LiftRow } from "@/components/dashboard/motion";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const [overview, path] = await Promise.all([
    load<ProgressOverviewResponse>("/api/progress/overview"),
    load<LearningPathResponse>("/api/learning/path"),
  ]);

  if (!overview.ok) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Overview</h1>
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

  const panel = "shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]";
  const stats = [
    {
      label: "This week",
      value: <AnimatedNumber value={o.weekly.attempts} countUp />,
      hint: o.weekly.attempts === 1 ? "attempt" : "attempts",
    },
    {
      label: "Average score",
      value:
        o.weekly.averageScore === null ? "—" : <AnimatedNumber value={Math.round(o.weekly.averageScore)} countUp />,
      hint: o.weekly.averageScore === null ? "no graded work yet" : "out of 100, this week",
    },
    {
      label: "Skills improved",
      value: <AnimatedNumber value={o.weekly.skillsImproved} countUp />,
      hint: "this week",
    },
    {
      label: "Time practised",
      value: <AnimatedNumber value={o.weekly.minutesEstimate} countUp suffix=" min" />,
      hint: "estimate, this week",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Hello, {firstName(o.profile)}</h1>
          <p className="mt-1.5 text-sm text-muted">
            Goal: {goalLabel(o.profile.learningGoal)} · {o.masteredCount} of {o.totalSkills} skills mastered
            {o.streakDays > 0 ? ` · ${o.streakDays}-day streak` : ""}
          </p>
        </div>
      </div>

      <NextMissionCard mission={o.nextMission} skillName={skillNames[o.nextMission.skillId]} />

      <dl
        className={cn(
          "grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-4",
          panel,
        )}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex min-w-0 flex-col bg-surface px-5 py-4 transition-colors duration-200 hover:bg-surface-raised"
          >
            <dt className="truncate text-sm text-muted">{s.label}</dt>
            <dd className="tabular mt-1.5 truncate text-2xl font-semibold leading-tight tracking-tight text-fg sm:text-3xl">
              {s.value}
            </dd>
            <dd className="mt-1 truncate text-xs text-subtle">{s.hint}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <Card className={panel}>
            <CardHeader className="flex-row items-baseline justify-between">
              <CardTitle>Your track</CardTitle>
              <Link
                href="/app/learn"
                className="group inline-flex items-center gap-0.5 text-sm text-accent underline-offset-4 hover:underline"
              >
                Open learning path
                <ChevronRight
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </CardHeader>
            <CardContent>
              <div className="mb-5 rounded-lg border border-line bg-surface-sunken p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-medium">
                    {path.ok ? path.data.curriculum.path.title : "Crypto market analyst foundations"}
                  </span>
                  <span className="shrink-0 text-sm text-muted">
                    <AnimatedNumber value={masteredShare} countUp suffix="%" className="font-semibold text-fg" /> mastered
                  </span>
                </div>
                <GrowBar value={masteredShare} label="Share of skills mastered" className="mt-3" />
              </div>
              {modules ? (
                <ul className="-mx-2 space-y-0.5">
                  {modules.map(({ module, unlocked, progress }, i) => {
                    const pct = Math.round(progress * 100);
                    const done = pct >= 100;
                    return (
                      <LiftRow
                        key={module.id}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors duration-200 hover:bg-surface-raised",
                          !unlocked && "text-muted",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-md border font-mono text-xs tabular-nums",
                            done
                              ? "border-transparent bg-success-soft text-success"
                              : unlocked
                                ? "border-line-strong bg-surface-raised text-fg"
                                : "border-dashed border-line-strong text-subtle",
                          )}
                        >
                          {done ? <Check className="size-3.5" /> : module.sequence}
                        </span>
                        <Link
                          href={`/app/learn/${encodeURIComponent(module.id)}`}
                          className="min-w-0 flex-1 truncate underline-offset-4 hover:underline"
                        >
                          {module.title}
                        </Link>
                        {!unlocked ? (
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted">
                            <Lock className="size-3" aria-hidden="true" />
                            Locked
                          </span>
                        ) : null}
                        <GrowBar
                          value={pct}
                          label={`${module.title} progress`}
                          index={i}
                          size="sm"
                          tone={done ? "success" : unlocked ? "accent" : "neutral"}
                          className="w-16 shrink-0 sm:w-28"
                        />
                        <span className="w-9 shrink-0 text-right font-mono text-xs tabular-nums text-muted">{pct}%</span>
                      </LiftRow>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted">
                  Module progress is unavailable right now{path.ok ? "" : `: ${describeError(path.error)}`}.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className={panel}>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityList events={o.recentActivity.slice(0, 8)} skillNames={skillNames} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className={panel}>
            <CardHeader>
              <CardTitle>Weakest right now</CardTitle>
            </CardHeader>
            <CardContent>
              {o.weakestSkills.length === 0 ? (
                <p className="text-sm text-muted">No weak spots found yet. Do a scenario and the coach will find some.</p>
              ) : (
                <ul className="-mx-2 space-y-0.5">
                  {o.weakestSkills.map((w) => {
                    const status = o.skills.find((s) => s.skill.id === w.skillId)?.mastery?.masteryStatus ?? "not-started";
                    return (
                      <LiftRow
                        key={w.skillId}
                        className="rounded-lg px-2 py-2.5 text-sm transition-colors duration-200 hover:bg-surface-raised"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <Link
                            href={`/app/coach?skill=${encodeURIComponent(w.skillId)}`}
                            className="min-w-0 truncate font-medium underline-offset-4 hover:underline"
                          >
                            {skillNames[w.skillId] ?? humanise(w.skillId)}
                          </Link>
                          <MasteryIndicator status={status} score={w.masteryScore} size="sm" hideLabel />
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-muted">{w.reason}</p>
                      </LiftRow>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className={panel}>
            <CardHeader>
              <CardTitle>Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <ReviewList reviews={o.upcomingReviews.slice(0, 5)} skillNames={skillNames} />
            </CardContent>
          </Card>

          {o.recurringMisconceptions.length > 0 ? (
            <Card className={panel}>
              <CardHeader>
                <CardTitle>Ideas that keep coming back</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-line text-sm">
                  {o.recurringMisconceptions.slice(0, 5).map((m) => (
                    <li key={m.misconceptionId} className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0">
                      <span>{m.label || humanise(m.misconceptionId)}</span>
                      <span className="shrink-0 rounded-md bg-surface-sunken px-1.5 py-0.5 font-mono text-xs tabular-nums text-muted">
                        ×{m.count}
                      </span>
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
