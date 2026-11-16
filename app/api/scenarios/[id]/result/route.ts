import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/db";
import { ApiError, handle, ok } from "@/lib/server/api";
import type { ScenarioResultResponse } from "@/lib/types";

export const GET = handle(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const repo = await getRepository();
  const scenario = await repo.getScenario(id);
  if (!scenario) throw new ApiError("not_found", "Scenario not found.");
  const attempts = await repo.listAttempts(user.id, { scenarioId: id });
  return ok<ScenarioResultResponse>(attempts);
});
