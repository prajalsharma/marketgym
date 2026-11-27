import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/db";
import { handle, ok, readJson } from "@/lib/server/api";
import { listPortfolioResponses, upsertPortfolio } from "@/lib/server/portfolio";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { portfolioUpsertSchema } from "@/lib/server/validation";
import type { PortfolioResponse } from "@/lib/types";

/** GET /api/portfolio: the learner's practice portfolios, newest first, each with its analysis. */
export const GET = handle(async () => {
  const user = await requireUser();
  const repo = await getRepository();
  return ok<PortfolioResponse[]>(await listPortfolioResponses(repo, user));
});

/** POST /api/portfolio: create a practice portfolio (educational only, no funds). */
export const POST = handle(async (req) => {
  const user = await requireUser();
  enforceRateLimit(req, "default", user.id);
  const input = portfolioUpsertSchema.parse(await readJson(req));
  const repo = await getRepository();
  return ok<PortfolioResponse>(await upsertPortfolio(repo, user, input, null));
});
