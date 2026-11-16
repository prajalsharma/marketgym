import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { LearningPathResponse, ScenarioGetResponse, ScenarioResultResponse } from "@/lib/types/api";
import { PageHeader } from "@/components/ui";
import { ScenarioLab } from "@/components/scenario/scenario-lab";
import type { MisconceptionLookup } from "@/components/scenario/evaluation-panel";
import { RetryError } from "@/components/shared/retry-error";
import { load } from "@/lib/client/server-api";
import { describeError, isApiClientError } from "@/lib/client/api";

export const metadata: Metadata = { title: "Scenario lab" };

export default async function ScenarioPage(props: PageProps<"/app/scenario-lab/[id]">) {
  const { id } = await props.params;
  const [scenario, results, path] = await Promise.all([
    load<ScenarioGetResponse>(`/api/scenarios/${encodeURIComponent(id)}`),
    load<ScenarioResultResponse>(`/api/scenarios/${encodeURIComponent(id)}/result`),
    load<LearningPathResponse>("/api/learning/path"),
  ]);

  if (!scenario.ok) {
    if (isApiClientError(scenario.error) && scenario.error.code === "not_found" && scenario.error.status === 404 && !scenario.error.message.startsWith("Request failed")) {
      notFound();
    }
    return (
      <div className="space-y-6">
        <PageHeader title="Scenario lab" />
        <RetryError title="Could not load this scenario" description={describeError(scenario.error)} />
      </div>
    );
  }

  const misconceptions: MisconceptionLookup = {};
  const skillNames: Record<string, string> = {};
  if (path.ok) {
    for (const m of path.data.curriculum.misconceptions) misconceptions[m.id] = { label: m.label, correction: m.correction };
    for (const s of path.data.curriculum.skills) skillNames[s.id] = s.name;
  }

  const { latestAttempt, ...rest } = scenario.data;
  const history = results.ok ? results.data : latestAttempt ? [latestAttempt] : [];
  const sorted = [...history].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <ScenarioLab scenario={rest} previousAttempts={sorted} misconceptions={misconceptions} skillNames={skillNames} />
  );
}
