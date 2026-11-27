import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/db";
import { handle, ok, readJson } from "@/lib/server/api";
import { getOwnedPortfolio, upsertPortfolio } from "@/lib/server/portfolio";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { portfolioUpsertSchema } from "@/lib/server/validation";
import type { PortfolioResponse } from "@/lib/types";

/** PUT /api/portfolio/[id]: replace one of the learner's own practice portfolios. */
export const PUT = handle(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  enforceRateLimit(req, "default", user.id);
  const { id } = await ctx.params;
  const repo = await getRepository();
  const existing = await getOwnedPortfolio(repo, user, id);
  const input = portfolioUpsertSchema.parse(await readJson(req));
  return ok<PortfolioResponse>(await upsertPortfolio(repo, user, input, existing));
});
