import { getMarketServices } from "@/lib/market-data/services";
import { handle, ok, queryObject } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { marketOrderBookQuerySchema } from "@/lib/server/validation";
import type { MarketOrderBookResponse } from "@/lib/types";

export const GET = handle(async (req) => {
  enforceRateLimit(req, "market");
  const { market, limit } = marketOrderBookQuerySchema.parse(queryObject(req));
  const book = await getMarketServices().orderBooks.getOrderBook(market, limit);
  return ok<MarketOrderBookResponse>(book);
});
