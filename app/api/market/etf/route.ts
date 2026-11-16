import { getMarketServices } from "@/lib/market-data/services";
import { handle, ok, queryObject } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { marketEtfQuerySchema } from "@/lib/server/validation";
import type { MarketEtfResponse } from "@/lib/types";

export const GET = handle(async (req) => {
  enforceRateLimit(req, "market");
  const { asset } = marketEtfQuerySchema.parse(queryObject(req));
  const series = await getMarketServices().etf.getFlows(asset);
  return ok<MarketEtfResponse>([series]);
});
