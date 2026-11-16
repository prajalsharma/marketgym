import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/db";
import { runDiagnostic } from "@/lib/learning/diagnostic";
import { handle, newId, ok, readJson } from "@/lib/server/api";
import { loadLearnerState, logActivity, nextMissionFor } from "@/lib/server/learner";
import { diagnosticSubmitSchema } from "@/lib/server/validation";
import type { DiagnosticSubmitResponse } from "@/lib/types";

export const POST = handle(async (req) => {
  const user = await requireUser();
  const input = diagnosticSubmitSchema.parse(await readJson(req));
  const repo = await getRepository();
  const state = await loadLearnerState(repo, user);
  const now = new Date();

  const result = await runDiagnostic(state.profile, input.answers);
  const saved = await repo.saveDiagnostic({ ...result, id: result.id || newId(), userId: user.id, createdAt: result.createdAt || now.toISOString() });

  const profile = await repo.upsertProfile({
    ...state.profile,
    onboardingCompletedAt: state.profile.onboardingCompletedAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
  });

  await logActivity(
    repo,
    user.id,
    {
      kind: "diagnostic",
      skillIds: saved.estimates.map((e) => e.skillId),
      summary: `Completed the diagnostic; recommended start: ${saved.recommendedStartSkillId}.`,
      refId: saved.id,
    },
    now,
  );

  const nextMission = nextMissionFor({ ...state, profile, diagnostic: saved });
  return ok<DiagnosticSubmitResponse>({ ...saved, nextMission });
});
