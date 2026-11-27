import { orderBookQuerySchema } from "@/lib/market-data/params";
import { getMarketServices } from "@/lib/market-data/services";
import { handle, ok, queryObject } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import type { MarketOrderBookResponse } from "@/lib/types";

/** market = spot symbol (vBTC_vUSDC, vETH_vUSDC, vANT_vUSDC, ...) or perps id (perps:ANT-USD); unlisted → 404 */
export const GET = handle(async (req) => {
  enforceRateLimit(req, "market");
  const { market, limit } = orderBookQuerySchema.parse(queryObject(req));
  const book = await getMarketServices().orderBooks.get(market, limit);
  return ok<MarketOrderBookResponse>(book);
});
