import type { Metadata } from "next";
import type { LearningPathResponse } from "@/lib/types/api";
import { PageHeader } from "@/components/ui";
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={path.curriculum.path.title}
        description={`${path.modules.length} modules · ${path.skills.length} skills · ${mastered} mastered, ${practising} practising`}
      />
      <NextMissionCard mission={path.nextMission} skillName={skillName} heading="Suggested next step" />
      <SkillMap path={path} />
    </div>
  );
}
