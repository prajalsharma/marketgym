import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/db";
import { ApiError, handle, ok } from "@/lib/server/api";
import type { ScenarioGetResponse } from "@/lib/types";

export const GET = handle(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const repo = await getRepository();
  const scenario = await repo.getScenario(id);
  if (!scenario) throw new ApiError("not_found", "Scenario not found.");
  const [latestAttempt] = await repo.listAttempts(user.id, { scenarioId: id, limit: 1 });
  return ok<ScenarioGetResponse>({ ...scenario, latestAttempt: latestAttempt ?? null });
});
