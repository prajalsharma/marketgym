import { coachRespond } from "@/lib/ai/coach";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/db";
import { buildEvidencePack } from "@/lib/market-data/evidence";
import { ApiError, handle, ok, readJson } from "@/lib/server/api";
import { evidenceRequirementsForSkill } from "@/lib/server/evidence-for-skill";
import { loadLearnerState } from "@/lib/server/learner";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { coachRespondSchema } from "@/lib/server/validation";
import type { CoachRespondResponse } from "@/lib/types";

export const POST = handle(async (req) => {
  const user = await requireUser();
  enforceRateLimit(req, "coach", user.id);
  const input = coachRespondSchema.parse(await readJson(req));
  const repo = await getRepository();
  const session = await repo.getCoachSession(user.id, input.sessionId);
  if (!session) throw new ApiError("not_found", "Coach session not found.");
  if (session.status === "completed") throw new ApiError("validation_error", "This coach session is finished. Start a new one.");

  const state = await loadLearnerState(repo, user);
  const evidence = await buildEvidencePack(evidenceRequirementsForSkill(session.skillId));
  const updated = await coachRespond(session, input.message, { memory: state.memory, evidence });
  const saved = await repo.saveCoachSession({ ...updated, id: session.id, userId: user.id });
  return ok<CoachRespondResponse>(saved);
});
