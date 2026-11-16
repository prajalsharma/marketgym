import { getMarketServices } from "@/lib/market-data/services";
import { handle, ok, queryObject } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { marketNewsQuerySchema } from "@/lib/server/validation";
import type { MarketNewsResponse } from "@/lib/types";

export const GET = handle(async (req) => {
  enforceRateLimit(req, "market");
  const { limit, category } = marketNewsQuerySchema.parse(queryObject(req));
  const news = await getMarketServices().news.getNews({ limit, ...(category ? { category } : {}) });
  return ok<MarketNewsResponse>(news);
});
