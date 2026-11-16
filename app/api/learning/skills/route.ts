import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/db";
import { computeSkillProgress } from "@/lib/learning/curriculum-engine";
import { handle, ok } from "@/lib/server/api";
import type { LearningSkillsResponse } from "@/lib/types";

export const GET = handle(async () => {
  const user = await requireUser();
  const repo = await getRepository();
  const mastery = await repo.listMastery(user.id);
  return ok<LearningSkillsResponse>(computeSkillProgress(mastery));
});
