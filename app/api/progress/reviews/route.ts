import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/db";
import { handle, ok } from "@/lib/server/api";
import type { ProgressReviewsResponse } from "@/lib/types";

export const GET = handle(async () => {
  const user = await requireUser();
  const repo = await getRepository();
  return ok<ProgressReviewsResponse>(await repo.listReviews(user.id));
});
