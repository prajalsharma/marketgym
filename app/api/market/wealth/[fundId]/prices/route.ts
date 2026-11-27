import { wealthFundParamsSchema, wealthPriceQuerySchema } from "@/lib/market-data/params";
import { getMarketServices } from "@/lib/market-data/services";
import { handle, ok, queryObject } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import type { WealthPriceHistoryResponse } from "@/lib/types";

export const GET = handle(async (req, ctx: { params: Promise<{ fundId: string }> }) => {
  enforceRateLimit(req, "market");
  const { fundId } = wealthFundParamsSchema.parse(await ctx.params);
  const { range } = wealthPriceQuerySchema.parse(queryObject(req));
  const series = await getMarketServices().wealth.getPriceHistory(fundId, range);
  return ok<WealthPriceHistoryResponse>(series);
});
