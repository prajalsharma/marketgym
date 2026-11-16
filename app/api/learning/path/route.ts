import { requireUser } from "@/lib/auth/session";
import { curriculum } from "@/lib/curriculum";
import { getRepository } from "@/lib/db";
import { computeModuleProgress, computeSkillProgress } from "@/lib/learning/curriculum-engine";
import { handle, ok } from "@/lib/server/api";
import { loadLearnerState, nextMissionFor } from "@/lib/server/learner";
import type { LearningPathResponse } from "@/lib/types";

export const GET = handle(async () => {
  const user = await requireUser();
  const repo = await getRepository();
  const state = await loadLearnerState(repo, user);
  const skills = computeSkillProgress(state.mastery);
  return ok<LearningPathResponse>({
    curriculum,
    skills,
    modules: computeModuleProgress(skills),
    nextMission: nextMissionFor(state),
  });
});
