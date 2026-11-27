import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/db";
import { ApiError, handle, ok } from "@/lib/server/api";
import { PORTFOLIO_REVIEW_TEMPLATE_ID } from "@/lib/learning/portfolio";
import type { ScenarioGetResponse } from "@/lib/types";

export const GET = handle(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const repo = await getRepository();
  const scenario = await repo.getScenario(id);
  if (!scenario) throw new ApiError("not_found", "Scenario not found.");
  const [latestAttempt] = await repo.listAttempts(user.id, { scenarioId: id, limit: 1 });
  // portfolio-review scenarios describe one learner's holdings: only that learner (who has the attempt) may read them
  if (scenario.templateId === PORTFOLIO_REVIEW_TEMPLATE_ID && !latestAttempt) throw new ApiError("not_found", "Scenario not found.");
  return ok<ScenarioGetResponse>({ ...scenario, latestAttempt: latestAttempt ?? null });
});
