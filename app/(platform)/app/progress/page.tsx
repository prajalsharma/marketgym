import type { Metadata } from "next";
import { AnimatedNumber } from "@/components/ui/animated-number";
import Link from "next/link";
import type {
  ProgressAttemptsResponse,
  ProgressOverviewResponse,
  ProgressReviewsResponse,
  ProgressSkillsResponse,
} from "@/lib/types/api";
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, MasteryIndicator, PageHeader, Stat } from "@/components/ui";
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="My progress"
        description={`${o.masteredCount} of ${o.totalSkills} skills mastered${o.streakDays > 0 ? ` · ${o.streakDays}-day streak` : ""}`}
      />

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-4">
        <Stat className="bg-surface p-4" label="Mastered" value={<AnimatedNumber value={o.masteredCount} countUp />} hint={`of ${o.totalSkills} skills`} />
        <Stat className="bg-surface p-4" label="Streak" value={<AnimatedNumber value={o.streakDays} countUp />} hint={o.streakDays === 1 ? "day" : "days"} />
        <Stat
          className="bg-surface p-4"
          label="Attempts this week"
          value={<AnimatedNumber value={o.weekly.attempts} countUp />}
          hint={o.weekly.averageScore === null ? "no scores yet" : `avg ${Math.round(o.weekly.averageScore)}`}
        />
        <Stat
          className="bg-surface p-4"
          label="Reviews due"
          value={<AnimatedNumber value={reviewList.filter((r) => !r.completedAt && new Date(r.scheduledAt) <= new Date()).length} countUp />}
          hint="ready now"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Skill passport</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {[...byModule.entries()].map(([moduleId, list]) => (
                <div key={moduleId}>
                  <p className="text-xs font-medium text-muted">{categoryLabel(moduleId)}</p>
                  <ul className="mt-1.5 divide-y divide-line">
                    {list.map((s) => (
                      <li key={s.skill.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <span className={s.unlocked ? "" : "text-muted"}>{s.skill.name}</span>
                        <MasteryIndicator status={s.mastery?.masteryStatus ?? "not-started"} score={s.mastery?.masteryScore} size="sm" />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assessment history</CardTitle>
            </CardHeader>
            <CardContent>
              {history === null ? (
                <p className="text-sm text-muted">Attempt history is unavailable: {describeError(attempts.ok ? null : attempts.error)}</p>
              ) : history.length === 0 ? (
                <EmptyState
                  title="No graded attempts yet"
                  description="Scenario lab attempts land here with their score and how they were graded."
                  action={
                    <Link href="/app/scenario-lab" className="text-sm text-accent underline-offset-4 hover:underline">
                      Open the Scenario lab
                    </Link>
                  }
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-muted">
                      <tr>
                        <th className="py-1.5 pr-3 font-medium">Date</th>
                        <th className="py-1.5 pr-3 font-medium">Skills</th>
                        <th className="py-1.5 pr-3 text-right font-medium">Score</th>
                        <th className="py-1.5 font-medium">Graded by</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {history.map((a) => (
                        <tr key={a.id}>
                          <td className="whitespace-nowrap py-2 pr-3 text-muted">
                            <Link href={`/app/scenario-lab/${encodeURIComponent(a.scenarioId)}`} className="underline-offset-4 hover:underline">
                              {formatDateTime(a.createdAt)}
                            </Link>
                          </td>
                          <td className="py-2 pr-3">{a.skillIds.map((id) => skillNames[id] ?? humanise(id)).join(", ")}</td>
                          <td className="py-2 pr-3 text-right font-mono tabular-nums">{a.evaluation.totalScore}</td>
                          <td className="py-2">
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

        <div className="space-y-6">
          <Card>
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
                    <li key={s.skill.id} className="py-2 text-sm">
                      <p>{s.skill.name}</p>
                      <p className="text-xs text-muted">
                        {s.mastery?.evidenceCount ?? 0} piece{(s.mastery?.evidenceCount ?? 0) === 1 ? "" : "s"} of evidence
                        {s.mastery?.lastAssessedAt ? ` · last assessed ${formatRelative(s.mastery.lastAssessedAt)}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Repeated misconceptions</CardTitle>
            </CardHeader>
            <CardContent>
              {o.recurringMisconceptions.length === 0 ? (
                <p className="text-sm text-muted">None recurring. Good sign.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {o.recurringMisconceptions.map((m) => (
                    <li key={m.misconceptionId} className="flex items-baseline justify-between gap-3">
                      <span>{m.label || humanise(m.misconceptionId)}</span>
                      <span className="whitespace-nowrap font-mono text-xs tabular-nums text-muted">
                        ×{m.count} · {formatRelative(m.lastSeenAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Review schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <ReviewList reviews={reviewList.filter((r) => !r.completedAt).slice(0, 8)} skillNames={skillNames} />
            </CardContent>
          </Card>

          <NextMissionCard mission={o.nextMission} skillName={skillNames[o.nextMission.skillId]} heading="Recommended" />
          {o.weakestSkills.length > 0 ? (
            <div className="text-sm">
              <p className="text-xs font-medium text-muted">Also worth practising</p>
              <ul className="mt-1.5 space-y-1">
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
