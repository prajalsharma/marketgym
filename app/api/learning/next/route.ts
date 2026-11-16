import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/db";
import { handle, ok } from "@/lib/server/api";
import { loadLearnerState, nextMissionFor } from "@/lib/server/learner";
import type { LearningNextResponse } from "@/lib/types";

export const GET = handle(async () => {
  const user = await requireUser();
  const repo = await getRepository();
  const state = await loadLearnerState(repo, user);
  return ok<LearningNextResponse>(nextMissionFor(state));
});
