import { requireUser } from "@/lib/auth/session";
import { getKnowledgeCheck } from "@/lib/curriculum";
import { getRepository } from "@/lib/db";
import { ApiError, handle, newId, ok, readJson } from "@/lib/server/api";
import { logActivity, recomputeMastery } from "@/lib/server/learner";
import { knowledgeCheckSubmitSchema } from "@/lib/server/validation";
import type { KnowledgeCheckSubmitResponse } from "@/lib/types";

export const POST = handle(async (req) => {
  const user = await requireUser();
  const input = knowledgeCheckSubmitSchema.parse(await readJson(req));
  const check = getKnowledgeCheck(input.knowledgeCheckId);
  if (!check) throw new ApiError("not_found", `Knowledge check ${input.knowledgeCheckId} does not exist.`);
  const option = check.options.find((o) => o.id === input.optionId);
  if (!option) throw new ApiError("validation_error", "That option does not belong to this knowledge check.");

  const repo = await getRepository();
  const now = new Date();
  const misconceptionId = !option.correct && option.misconceptionId ? option.misconceptionId : null;
  await repo.saveKnowledgeCheckResult({
    id: newId(),
    userId: user.id,
    skillId: check.skillId,
    knowledgeCheckId: check.id,
    optionId: option.id,
    correct: option.correct,
    misconceptionId,
    reviewId: null,
    createdAt: now.toISOString(),
  });
  await recomputeMastery(repo, user.id, [check.skillId], now);
  await logActivity(
    repo,
    user.id,
    {
      kind: "knowledge-check",
      skillIds: [check.skillId],
      summary: `${option.correct ? "Correct" : "Missed"} knowledge check on ${check.skillId}.`,
      score: option.correct ? 100 : 0,
      refId: check.id,
    },
    now,
  );

  return ok<KnowledgeCheckSubmitResponse>({
    correct: option.correct,
    explanation: option.explanation,
    ...(misconceptionId ? { misconceptionId } : {}),
    check,
  });
});
