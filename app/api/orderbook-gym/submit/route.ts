import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/db";
import { gradeOrderBookExercise, listOrderBookExercises } from "@/lib/learning/orderbook-exercises";
import { getMarketServices } from "@/lib/market-data/services";
import { ApiError, handle, newId, ok, readJson } from "@/lib/server/api";
import { logActivity, recomputeMastery } from "@/lib/server/learner";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { orderBookExerciseSubmitSchema } from "@/lib/server/validation";
import type { OrderBookExerciseSubmitResponse, OrderBookSnapshot } from "@/lib/types";

export const POST = handle(async (req) => {
  const user = await requireUser();
  enforceRateLimit(req, "scenarios", user.id);
  const input = orderBookExerciseSubmitSchema.parse(await readJson(req));
  const exercise = listOrderBookExercises().find((e) => e.id === input.exerciseId);
  if (!exercise) throw new ApiError("not_found", `Exercise ${input.exerciseId} does not exist.`);

  const markets = [...new Set([input.market, ...exercise.markets])];
  const { orderBooks } = getMarketServices();
  const books: Record<string, OrderBookSnapshot> = {};
  for (const m of markets) books[m] = await orderBooks.getOrderBook(m, 20);

  const shown = input.snapshotTimestamp;
  const graded = books[input.market];
  const bookMoved = graded !== undefined && graded.timestamp !== shown;
  const { score, results } = gradeOrderBookExercise(exercise, books, input.answers);
  const finalResults = bookMoved
    ? results.map((r) => ({
        ...r,
        explanation: `${r.explanation} Note: the book moved since the snapshot you saw (${shown}); graded against the current book at ${graded.timestamp}.`,
      }))
    : results;

  const repo = await getRepository();
  const now = new Date();
  for (const r of finalResults) {
    const question = exercise.questions.find((q) => q.id === r.questionId);
    const given = input.answers[r.questionId];
    await repo.saveKnowledgeCheckResult({
      id: newId(),
      userId: user.id,
      skillId: exercise.skillIds[0] ?? "orderbook",
      knowledgeCheckId: `${exercise.id}:${r.questionId}`,
      optionId: given !== undefined ? String(given) : question?.kind === "choice" ? "" : "",
      correct: r.correct,
      misconceptionId: null,
      reviewId: null,
      createdAt: now.toISOString(),
    });
  }
  const masteryUpdates = await recomputeMastery(repo, user.id, exercise.skillIds, now);
  await logActivity(
    repo,
    user.id,
    {
      kind: "orderbook",
      skillIds: exercise.skillIds,
      summary: `Order Book Gym "${exercise.title}" on ${input.market}: ${Math.round(score)}/100.`,
      score,
      refId: exercise.id,
    },
    now,
  );

  return ok<OrderBookExerciseSubmitResponse>({ score, results: finalResults, masteryUpdates });
});
