import { startCoachSession } from "@/lib/ai/coach";
import { requireUser } from "@/lib/auth/session";
import { getSkill } from "@/lib/curriculum";
import { getRepository } from "@/lib/db";
import { buildEvidencePack } from "@/lib/market-data/evidence";
import { ApiError, handle, newId, ok, queryObject, readJson } from "@/lib/server/api";
import { evidenceRequirementsForSkill } from "@/lib/server/evidence-for-skill";
import { loadLearnerState, logActivity } from "@/lib/server/learner";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { coachSessionCreateSchema, coachSessionQuerySchema } from "@/lib/server/validation";
import type { CoachSessionResponse } from "@/lib/types";

export const POST = handle(async (req) => {
  const user = await requireUser();
  enforceRateLimit(req, "coach", user.id);
  const input = coachSessionCreateSchema.parse(await readJson(req));
  if (!getSkill(input.skillId)) throw new ApiError("not_found", `Skill ${input.skillId} does not exist.`);

  const repo = await getRepository();
  const state = await loadLearnerState(repo, user);
  const evidence = await buildEvidencePack(evidenceRequirementsForSkill(input.skillId));
  const session = await startCoachSession({ userId: user.id, skillId: input.skillId, memory: state.memory, evidence });
  const saved = await repo.saveCoachSession({ ...session, id: session.id || newId(), userId: user.id });
  await logActivity(repo, user.id, { kind: "coach", skillIds: [input.skillId], summary: `Started a coach session on ${input.skillId} (${saved.mode}).`, refId: saved.id });
  return ok<CoachSessionResponse>(saved);
});

export const GET = handle(async (req) => {
  const user = await requireUser();
  const { id } = coachSessionQuerySchema.parse(queryObject(req));
  const repo = await getRepository();
  const session = await repo.getCoachSession(user.id, id);
  if (!session) throw new ApiError("not_found", "Coach session not found.");
  return ok<CoachSessionResponse>(session);
});
