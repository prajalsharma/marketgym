import { coachHint } from "@/lib/ai/coach";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/db";
import { ApiError, handle, ok, readJson } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { coachHintSchema } from "@/lib/server/validation";
import type { CoachHintResponse } from "@/lib/types";

export const POST = handle(async (req) => {
  const user = await requireUser();
  enforceRateLimit(req, "coach", user.id);
  const input = coachHintSchema.parse(await readJson(req));
  const repo = await getRepository();
  const session = await repo.getCoachSession(user.id, input.sessionId);
  if (!session) throw new ApiError("not_found", "Coach session not found.");
  if (session.hintsRevealed >= 3) throw new ApiError("validation_error", "All three hints have already been revealed.");
  const updated = coachHint(session);
  const saved = await repo.saveCoachSession({ ...updated, id: session.id, userId: user.id });
  return ok<CoachHintResponse>(saved);
});
