import type { Metadata } from "next";
import type { LearningPathResponse, ScenarioNextResponse } from "@/lib/types/api";
import type { EvidencePack } from "@/lib/types/market";
import { PageHeader } from "@/components/ui";
import { CoachWorkspace } from "@/components/coach/coach-workspace";
import { RetryError } from "@/components/shared/retry-error";
import { load } from "@/lib/client/server-api";
import { describeError } from "@/lib/client/api";

export const metadata: Metadata = { title: "AI coach" };

export default async function CoachPage(props: PageProps<"/app/coach">) {
  const sp = await props.searchParams;
  const res = await load<LearningPathResponse>("/api/learning/path");
  if (!res.ok) {
    return (
      <div className="space-y-6">
        <PageHeader title="AI coach" />
        <RetryError title="Could not load the coach" description={describeError(res.error)} />
      </div>
    );
  }
  const path = res.data;
  const requested = typeof sp.skill === "string" ? sp.skill : null;
  const skillId = requested && path.skills.some((s) => s.skill.id === requested) ? requested : path.nextMission.skillId;
  const skill = path.skills.find((s) => s.skill.id === skillId)?.skill ?? path.curriculum.skills.find((s) => s.id === skillId);
  const moduleEntry = path.modules.find((m) => m.module.skillIds.includes(skillId) || m.module.id === skillId);

  if (!skill || !moduleEntry) {
    return (
      <div className="space-y-6">
        <PageHeader title="AI coach" />
        <RetryError title="Unknown skill" description={`No skill called "${skillId}" is in the curriculum.`} />
      </div>
    );
  }

  // Evidence the coach can cite: the next scenario for this skill, if the API can produce one.
  let evidence: EvidencePack | null = null;
  const scenario = await load<ScenarioNextResponse>(`/api/scenarios/next?skillId=${encodeURIComponent(skillId)}`);
  if (scenario.ok) evidence = scenario.data.evidence;

  const checks = moduleEntry.module.knowledgeChecks;

  return (
    <div className="space-y-6">
      <PageHeader title="AI coach" description="Short turns. The coach asks, you answer with evidence, then it checks what you understood." />
      <CoachWorkspace skill={skill} module={moduleEntry.module} evidence={evidence} checks={checks} />
    </div>
  );
}
