import { requireUser } from "@/lib/auth/session";
import { getSkill } from "@/lib/curriculum";
import { getRepository } from "@/lib/db";
import { buildScenario, pickTemplateForSkill } from "@/lib/learning/scenario-generator";
import { buildEvidencePack } from "@/lib/market-data/evidence";
import { ApiError, handle, newId, ok, queryObject } from "@/lib/server/api";
import { loadLearnerState } from "@/lib/server/learner";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { scenarioNextQuerySchema } from "@/lib/server/validation";
import type { ScenarioNextResponse } from "@/lib/types";

/** A scenario built for the same template within this window is reused, so learners keep one id while answering. */
export const SCENARIO_REUSE_WINDOW_MS = 30 * 60_000;

export const GET = handle(async (req) => {
  const user = await requireUser();
  enforceRateLimit(req, "scenarios", user.id);
  const { skillId } = scenarioNextQuerySchema.parse(queryObject(req));
  if (!getSkill(skillId)) throw new ApiError("not_found", `Skill ${skillId} does not exist.`);

  const repo = await getRepository();
  const state = await loadLearnerState(repo, user);
  let template;
  try {
    template = pickTemplateForSkill(skillId, state.attempts, state.memory);
  } catch {
    throw new ApiError("not_found", `No exercise template is available for ${skillId} yet.`);
  }

  const now = Date.now();
  const recent = await repo.listScenariosByTemplate(template.id, 5);
  // reuse only a scenario this learner has not answered yet: the window keeps one id
  // stable while they write, but a submitted scenario must not come back as "next"
  const answered = new Set(state.attempts.map((a) => a.scenarioId));
  const reusable = recent.find((s) => now - Date.parse(s.createdAt) < SCENARIO_REUSE_WINDOW_MS && !answered.has(s.id));
  if (reusable) return ok<ScenarioNextResponse>(reusable);

  const evidence = await buildEvidencePack(template.evidenceRequirements);
  const scenario = buildScenario(template, evidence, newId());
  const saved = await repo.saveScenario(scenario);
  return ok<ScenarioNextResponse>(saved);
});
