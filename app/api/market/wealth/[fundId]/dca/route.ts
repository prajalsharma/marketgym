import { wealthDcaQuerySchema, wealthFundParamsSchema } from "@/lib/market-data/params";
import { getMarketServices } from "@/lib/market-data/services";
import { handle, ok, queryObject } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import type { WealthDcaResponse } from "@/lib/types";

export const GET = handle(async (req, ctx: { params: Promise<{ fundId: string }> }) => {
  enforceRateLimit(req, "market");
  const { fundId } = wealthFundParamsSchema.parse(await ctx.params);
  const { range } = wealthDcaQuerySchema.parse(queryObject(req));
  const dca = await getMarketServices().wealth.getDca(fundId, range);
  return ok<WealthDcaResponse>(dca);
});
