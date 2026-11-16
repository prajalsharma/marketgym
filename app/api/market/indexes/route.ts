import { getMarketServices } from "@/lib/market-data/services";
import { handle, ok } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import type { MarketIndexesResponse } from "@/lib/types";

export const GET = handle(async (req) => {
  enforceRateLimit(req, "market");
  const indexes = await getMarketServices().indexes.getIndexes();
  return ok<MarketIndexesResponse>(indexes);
});
