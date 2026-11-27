import type { Metadata } from "next";
import type { LearningPathResponse } from "@/lib/types/api";
import { PageHeader, Progress } from "@/components/ui";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { SkillMap } from "@/components/learn/skill-map";
import { NextMissionCard } from "@/components/platform/next-mission-card";
import { RetryError } from "@/components/shared/retry-error";
import { load } from "@/lib/client/server-api";
import { describeError } from "@/lib/client/api";

export const metadata: Metadata = { title: "My learning" };

export default async function LearnPage() {
  const res = await load<LearningPathResponse>("/api/learning/path");
  if (!res.ok) {
    return (
      <div className="space-y-6">
        <PageHeader title="My learning" />
        <RetryError title="Could not load your learning path" description={describeError(res.error)} />
      </div>
    );
  }
  const path = res.data;
  const mastered = path.skills.filter((s) => s.mastery?.masteryStatus === "mastered").length;
  const practising = path.skills.filter((s) => s.mastery?.masteryStatus === "practising").length;
  const skillName = path.skills.find((s) => s.skill.id === path.nextMission.skillId)?.skill.name;

  const total = path.skills.length;
  const masteredPct = total > 0 ? Math.round((mastered / total) * 100) : 0;
  const stats = [
    { label: "Modules", value: path.modules.length },
    { label: "Skills", value: total },
    { label: "Mastered", value: mastered },
    { label: "Practising", value: practising },
  ];

  return (
    <div className="space-y-8">
      <header className="animate-rise-in space-y-5">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-fg text-balance sm:text-3xl">
            {path.curriculum.path.title}
          </h1>
          <p className="text-sm text-muted sm:text-base">
            {`${path.modules.length} modules · ${path.skills.length} skills · ${mastered} mastered, ${practising} practising`}
          </p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] sm:p-5">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="text-xs text-muted">{s.label}</dt>
                <dd className="tabular mt-0.5 text-2xl font-semibold text-fg">
                  <AnimatedNumber value={s.value} countUp />
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex items-center gap-3">
            <Progress value={masteredPct} tone="success" size="sm" label="Skills mastered" className="flex-1" />
            <span className="tabular shrink-0 text-xs text-muted">{masteredPct}% mastered</span>
          </div>
        </div>
      </header>
      <NextMissionCard mission={path.nextMission} skillName={skillName} heading="Suggested next step" />
      <SkillMap path={path} />
    </div>
  );
}
