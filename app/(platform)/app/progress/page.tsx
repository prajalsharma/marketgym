import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { Check, Flame } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import Link from "next/link";
import type {
  ProgressAttemptsResponse,
  ProgressOverviewResponse,
  ProgressReviewsResponse,
  ProgressSkillsResponse,
} from "@/lib/types/api";
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, PageHeader, Stat } from "@/components/ui";
import { MasteryBar, ModulePassport } from "@/components/progress/skill-passport";
import { ReviewList } from "@/components/platform/activity-list";
import { NextMissionCard } from "@/components/platform/next-mission-card";
import { RetryError } from "@/components/shared/retry-error";
import { load } from "@/lib/client/server-api";
import { describeError } from "@/lib/client/api";
import { formatDateTime, formatRelative, humanise } from "@/lib/client/format";
import { categoryLabel } from "@/lib/client/labels";

export const metadata: Metadata = { title: "My progress" };

export default async function ProgressPage() {
  const [overview, skills, attempts, reviews] = await Promise.all([
    load<ProgressOverviewResponse>("/api/progress/overview"),
    load<ProgressSkillsResponse>("/api/progress/skills"),
    load<ProgressAttemptsResponse>("/api/progress/attempts"),
    load<ProgressReviewsResponse>("/api/progress/reviews"),
  ]);

  if (!overview.ok) {
    return (
      <div className="space-y-6">
        <PageHeader title="My progress" />
        <RetryError title="Could not load your progress" description={describeError(overview.error)} />
      </div>
    );
  }
  const o = overview.data;
  const skillList = skills.ok ? skills.data : o.skills;
  const skillNames: Record<string, string> = {};
  for (const s of skillList) skillNames[s.skill.id] = s.skill.name;

  const byModule = new Map<string, typeof skillList>();
  for (const s of skillList) {
    const key = s.skill.parentSkillId ?? s.skill.category;
    byModule.set(key, [...(byModule.get(key) ?? []), s]);
  }
  const mastered = skillList.filter((s) => s.mastery?.masteryStatus === "mastered");
  const history = attempts.ok ? [...attempts.data].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)) : null;
  const reviewList = reviews.ok ? reviews.data : o.upcomingReviews;

  const dueNow = reviewList.filter((r) => !r.completedAt && new Date(r.scheduledAt) <= new Date()).length;
  const panel = "shadow-[inset_0_1px_0_rgb(255_255_255/0.04),var(--shadow-sm)]";

  return (
    <div className="space-y-8">
      <PageHeader
        className="animate-rise-in [&_h1]:text-2xl [&_h1]:tracking-tight sm:[&_h1]:text-3xl"
        title="My progress"
        description={`${o.masteredCount} of ${o.totalSkills} skills mastered${o.streakDays > 0 ? ` · ${o.streakDays}-day streak` : ""}`}
      />

      <div className={`animate-rise-in grid overflow-hidden rounded-lg border border-line-strong bg-line lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-px ${panel}`}>
        <div className="flex flex-col justify-between gap-5 bg-surface-raised p-5 sm:p-6">
          <div>
            <p className="text-sm text-muted">Mastered</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-5xl font-semibold leading-none tracking-tight text-accent sm:text-6xl">
                <AnimatedNumber value={o.masteredCount} countUp />
              </span>
              <span className="text-base text-muted">of {o.totalSkills} skills</span>
            </p>
          </div>
          <MasteryBar size="md" value={o.totalSkills > 0 ? (o.masteredCount / o.totalSkills) * 100 : 0} delay={0.2} />
        </div>
        <div className="grid gap-px bg-line sm:grid-cols-3">
          <Stat
            className="justify-center bg-surface p-4 sm:p-5 [&>span:nth-child(2)]:text-2xl"
            label="Streak"
            value={
              <span className="inline-flex items-center gap-1.5">
                <Flame className={o.streakDays > 0 ? "size-5 text-warning" : "size-5 text-subtle"} aria-hidden="true" />
                <AnimatedNumber value={o.streakDays} countUp />
              </span>
            }
            hint={o.streakDays === 1 ? "day" : "days"}
          />
          <Stat
            className="justify-center bg-surface p-4 sm:p-5 [&>span:nth-child(2)]:text-2xl"
            label="Attempts this week"
            value={<AnimatedNumber value={o.weekly.attempts} countUp />}
            hint={o.weekly.averageScore === null ? "no scores yet" : `avg ${Math.round(o.weekly.averageScore)}`}
          />
          <Stat
            className="justify-center bg-surface p-4 sm:p-5 [&>span:nth-child(2)]:text-2xl"
            label="Reviews due"
            value={<AnimatedNumber value={dueNow} countUp />}
            hint="ready now"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <div className="min-w-0 space-y-6">
          <Card padding="none" className={`overflow-hidden ${panel}`}>
            <CardHeader className="bg-surface-sunken/60 px-5 py-4">
              <CardTitle className="text-lg tracking-tight">Skill passport</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-line">
              {[...byModule.entries()].map(([moduleId, list], i) => (
                <ModulePassport
                  key={moduleId}
                  index={i}
                  title={categoryLabel(moduleId)}
                  skills={list.map((s) => ({
                    id: s.skill.id,
                    name: s.skill.name,
                    unlocked: s.unlocked,
                    status: s.mastery?.masteryStatus ?? "not-started",
                    score: s.mastery?.masteryScore,
                  }))}
                />
              ))}
            </CardContent>
          </Card>

          <Card padding="none" className={`overflow-hidden ${panel}`}>
            <CardHeader className="bg-surface-sunken/60 px-5 py-4">
              <CardTitle className="text-lg tracking-tight">Assessment history</CardTitle>
            </CardHeader>
            <CardContent>
              {history === null ? (
                <p className="px-5 py-4 text-sm text-muted">Attempt history is unavailable: {describeError(attempts.ok ? null : attempts.error)}</p>
              ) : history.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    title="No graded attempts yet"
                    description="Scenario lab attempts land here with their score and how they were graded."
                    action={
                      <Link href="/app/scenario-lab" className="text-sm text-accent underline-offset-4 hover:underline">
                        Open the Scenario lab
                      </Link>
                    }
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-muted">
                      <tr className="border-b border-line">
                        <th className="py-2.5 pl-5 pr-3 font-medium">Date</th>
                        <th className="py-2.5 pr-3 font-medium">Skills</th>
                        <th className="py-2.5 pr-3 text-right font-medium">Score</th>
                        <th className="py-2.5 pr-5 font-medium">Graded by</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {history.map((a) => (
                        <tr key={a.id} className="transition-colors duration-150 hover:bg-surface-raised">
                          <td className="whitespace-nowrap py-3 pl-5 pr-3 text-muted">
                            <Link href={`/app/scenario-lab/${encodeURIComponent(a.scenarioId)}`} className="underline-offset-4 hover:text-fg hover:underline">
                              {formatDateTime(a.createdAt)}
                            </Link>
                          </td>
                          <td className="min-w-[10rem] py-3 pr-3">{a.skillIds.map((id) => skillNames[id] ?? humanise(id)).join(", ")}</td>
                          <td className="py-3 pr-3 text-right font-mono text-base font-semibold tabular-nums">{a.evaluation.totalScore}</td>
                          <td className="whitespace-nowrap py-3 pr-5">
                            <Badge tone={a.evaluation.evaluatorMode === "llm" ? "info" : "neutral"}>
                              {a.evaluation.evaluatorMode === "llm" ? "AI + rules" : "Rules"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="stagger-in min-w-0 space-y-6">
          <Card className={panel}>
            <CardHeader>
              <CardTitle>Demonstrated mastery</CardTitle>
            </CardHeader>
            <CardContent>
              {mastered.length === 0 ? (
                <p className="text-sm text-muted">
                  Mastery needs two strong scenario scores on different scenarios, a passed review a day or more later, and no open critical misconception.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {mastered.map((s) => (
                    <li key={s.skill.id} className="flex gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-success-soft text-success" aria-hidden="true">
                        <Check className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium">{s.skill.name}</p>
                        <p className="text-xs text-muted">
                          {s.mastery?.evidenceCount ?? 0} piece{(s.mastery?.evidenceCount ?? 0) === 1 ? "" : "s"} of evidence
                          {s.mastery?.lastAssessedAt ? ` · last assessed ${formatRelative(s.mastery.lastAssessedAt)}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className={panel} style={{ "--i": 1 } as CSSProperties}>
            <CardHeader>
              <CardTitle>Repeated misconceptions</CardTitle>
            </CardHeader>
            <CardContent>
              {o.recurringMisconceptions.length === 0 ? (
                <p className="text-sm text-muted">None recurring. Good sign.</p>
              ) : (
                <ul className="divide-y divide-line text-sm">
                  {o.recurringMisconceptions.map((m) => (
                    <li key={m.misconceptionId} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                      <span className="min-w-0">{m.label || humanise(m.misconceptionId)}</span>
                      <span className="flex shrink-0 items-center gap-2 whitespace-nowrap font-mono text-xs tabular-nums text-muted">
                        <span className="rounded-md bg-warning-soft px-1.5 py-0.5 font-semibold text-warning">×{m.count}</span>
                        <span>· {formatRelative(m.lastSeenAt)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className={panel} style={{ "--i": 2 } as CSSProperties}>
            <CardHeader>
              <CardTitle>Review schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <ReviewList reviews={reviewList.filter((r) => !r.completedAt).slice(0, 8)} skillNames={skillNames} />
            </CardContent>
          </Card>

          <div style={{ "--i": 3 } as CSSProperties}>
            <NextMissionCard mission={o.nextMission} skillName={skillNames[o.nextMission.skillId]} heading="Recommended" />
          </div>
          {o.weakestSkills.length > 0 ? (
            <div className="text-sm" style={{ "--i": 4 } as CSSProperties}>
              <p className="text-sm font-semibold">Also worth practising</p>
              <ul className="mt-2 space-y-1.5">
                {o.weakestSkills.slice(0, 3).map((w) => (
                  <li key={w.skillId}>
                    <Link href={`/app/scenario-lab?skill=${encodeURIComponent(w.skillId)}`} className="text-accent underline-offset-4 hover:underline">
                      {skillNames[w.skillId] ?? humanise(w.skillId)}
                    </Link>
                    <span className="text-muted"> · {w.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
