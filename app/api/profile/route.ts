import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/db";
import { handle, ok, readJson } from "@/lib/server/api";
import { ensureProfile } from "@/lib/server/learner";
import { profileUpsertSchema } from "@/lib/server/validation";
import type { ProfileResponse } from "@/lib/types";

export const GET = handle(async () => {
  const user = await requireUser();
  const repo = await getRepository();
  const profile = await ensureProfile(repo, user);
  return ok<ProfileResponse>(profile);
});

export const PUT = handle(async (req) => {
  const user = await requireUser();
  const input = profileUpsertSchema.parse(await readJson(req));
  const repo = await getRepository();
  const existing = await ensureProfile(repo, user);
  const saved = await repo.upsertProfile({
    ...existing,
    displayName: input.displayName,
    experienceLevel: input.experienceLevel,
    learningGoal: input.learningGoal,
    preferredLearningStyle: input.preferredLearningStyle,
    interests: input.interests,
    updatedAt: new Date().toISOString(),
  });
  return ok<ProfileResponse>(saved);
});
