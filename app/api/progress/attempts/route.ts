import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/db";
import { handle, ok, queryObject } from "@/lib/server/api";
import { progressAttemptsQuerySchema } from "@/lib/server/validation";
import type { ProgressAttemptsResponse } from "@/lib/types";

export const GET = handle(async (req) => {
  const user = await requireUser();
  const { limit } = progressAttemptsQuerySchema.parse(queryObject(req));
  const repo = await getRepository();
  return ok<ProgressAttemptsResponse>(await repo.listAttempts(user.id, { limit }));
});
