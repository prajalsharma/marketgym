import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { LearningNextResponse, ScenarioNextResponse } from "@/lib/types/api";
import { PageHeader } from "@/components/ui";
import { RetryError } from "@/components/shared/retry-error";
import { load } from "@/lib/client/server-api";
import { describeError } from "@/lib/client/api";

export const metadata: Metadata = { title: "Scenario lab" };

/** Finds the next scenario for the requested skill (or the engine's next mission) and opens it. */
export default async function ScenarioLabPage(props: PageProps<"/app/scenario-lab">) {
  const sp = await props.searchParams;
  let skill = typeof sp.skill === "string" && sp.skill ? sp.skill : null;
  let failure: unknown = null;

  if (!skill) {
    const next = await load<LearningNextResponse>("/api/learning/next");
    if (next.ok) skill = next.data.skillId;
    else failure = next.error;
  }

  if (skill) {
    const res = await load<ScenarioNextResponse>(`/api/scenarios/next?skillId=${encodeURIComponent(skill)}`);
    if (res.ok) redirect(`/app/scenario-lab/${encodeURIComponent(res.data.id)}`);
    failure = res.error;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Scenario lab" description="Real evidence, one written analysis, a graded verdict." />
      <RetryError title="Could not prepare a scenario" description={describeError(failure)} />
    </div>
  );
}
