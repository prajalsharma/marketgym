import { wealthFundParamsSchema } from "@/lib/market-data/params";
import { getMarketServices } from "@/lib/market-data/services";
import { handle, ok } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import type { WealthFundResponse } from "@/lib/types";

export const GET = handle(async (req, ctx: { params: Promise<{ fundId: string }> }) => {
  enforceRateLimit(req, "market");
  const { fundId } = wealthFundParamsSchema.parse(await ctx.params);
  const fund = await getMarketServices().wealth.getFund(fundId);
  return ok<WealthFundResponse>(fund);
});
