import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/db";
import { handle, ok } from "@/lib/server/api";
import { getOwnedPortfolio, reviewPortfolio } from "@/lib/server/portfolio";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import type { PortfolioReviewResponse } from "@/lib/types";

/** POST /api/portfolio/[id]/review: grade the portfolio's written rationale against frozen Wealth evidence. */
export const POST = handle(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  enforceRateLimit(req, "scenarios", user.id);
  const { id } = await ctx.params;
  const repo = await getRepository();
  const portfolio = await getOwnedPortfolio(repo, user, id);
  return ok<PortfolioReviewResponse>(await reviewPortfolio(repo, user, portfolio));
});
