import { requireUser } from "@/lib/auth/session";
import { getKnowledgeCheck } from "@/lib/curriculum";
import { getRepository } from "@/lib/db";
import { ApiError, handle, newId, ok, readJson } from "@/lib/server/api";
import { logActivity, recomputeMastery } from "@/lib/server/learner";
import { reviewSubmitSchema } from "@/lib/server/validation";
import type { ReviewSubmitResponse } from "@/lib/types";

export const POST = handle(async (req) => {
  const user = await requireUser();
  const input = reviewSubmitSchema.parse(await readJson(req));
  const repo = await getRepository();
  const review = await repo.getReview(user.id, input.reviewId);
  if (!review) throw new ApiError("not_found", "Review not found.");
  if (review.completedAt) throw new ApiError("validation_error", "This review has already been completed.");

  const check = getKnowledgeCheck(input.knowledgeCheckId);
  if (!check) throw new ApiError("not_found", `Knowledge check ${input.knowledgeCheckId} does not exist.`);
  if (check.skillId !== review.skillId) throw new ApiError("validation_error", "That knowledge check belongs to a different skill than the review.");
  const option = check.options.find((o) => o.id === input.optionId);
  if (!option) throw new ApiError("validation_error", "That option does not belong to this knowledge check.");

  const now = new Date();
  const kcId = newId();
  await repo.saveKnowledgeCheckResult({
    id: kcId,
    userId: user.id,
    skillId: check.skillId,
    knowledgeCheckId: check.id,
    optionId: option.id,
    correct: option.correct,
    misconceptionId: !option.correct && option.misconceptionId ? option.misconceptionId : null,
    reviewId: review.id,
    createdAt: now.toISOString(),
  });
  const completed = await repo.saveReview({
    ...review,
    completedAt: now.toISOString(),
    result: option.correct ? "passed" : "failed",
    attemptId: kcId,
  });
  const [mastery] = await recomputeMastery(repo, user.id, [review.skillId], now);
  await logActivity(
    repo,
    user.id,
    {
      kind: "review",
      skillIds: [review.skillId],
      summary: `Retention review on ${review.skillId}: ${option.correct ? "passed" : "failed"}.`,
      score: option.correct ? 100 : 0,
      refId: review.id,
    },
    now,
  );
  if (!mastery) throw new ApiError("internal_error", "Mastery could not be recomputed.");
  return ok<ReviewSubmitResponse>({ review: completed, correct: option.correct, explanation: option.explanation, mastery });
});
