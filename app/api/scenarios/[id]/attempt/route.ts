import { evaluateAttempt } from "@/lib/ai/evaluators/evaluate";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/db";
import { ApiError, handle, newId, ok, readJson } from "@/lib/server/api";
import { loadLearnerState, logActivity, nextMissionFor, recomputeMastery } from "@/lib/server/learner";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { scenarioAttemptSchema } from "@/lib/server/validation";
import { PORTFOLIO_REVIEW_TEMPLATE_ID } from "@/lib/learning/portfolio";
import type { ScenarioAttempt, ScenarioAttemptResponse } from "@/lib/types";

export const POST = handle(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  enforceRateLimit(req, "scenarios", user.id);
  const { id } = await ctx.params;
  const input = scenarioAttemptSchema.parse(await readJson(req));

  const repo = await getRepository();
  const scenario = await repo.getScenario(id);
  if (!scenario) throw new ApiError("not_found", "Scenario not found.");
  // portfolio reviews are graded only through /api/portfolio/[id]/review, by the portfolio's owner
  if (scenario.templateId === PORTFOLIO_REVIEW_TEMPLATE_ID) throw new ApiError("not_found", "Scenario not found.");

  const state = await loadLearnerState(repo, user);
  const now = new Date();
  // grades against the scenario's frozen evidence pack; the LLM (if any) never touches the repository
  const evaluation = await evaluateAttempt({ scenario, answer: input.answer, hintsUsed: input.hintsUsed, memory: state.memory });

  const attempt: ScenarioAttempt = {
    id: newId(),
    userId: user.id,
    scenarioId: scenario.id,
    templateId: scenario.templateId,
    skillIds: scenario.skillIds,
    submittedAnswer: input.answer,
    hintsUsed: input.hintsUsed,
    evaluation,
    createdAt: now.toISOString(),
  };
  const saved = await repo.saveAttempt(attempt);

  // mastery is recomputed from ALL stored records, never from the client
  const masteryUpdates = await recomputeMastery(repo, user.id, scenario.skillIds, now);

  await logActivity(
    repo,
    user.id,
    {
      kind: "scenario",
      skillIds: scenario.skillIds,
      summary: `Scenario "${scenario.title}": scored ${Math.round(evaluation.totalScore)}/100 (${evaluation.evaluatorMode}).`,
      score: evaluation.totalScore,
      refId: scenario.id,
    },
    now,
  );

  const after = await loadLearnerState(repo, user);
  return ok<ScenarioAttemptResponse>({ attempt: saved, evaluation, masteryUpdates, nextMission: nextMissionFor(after) });
});
