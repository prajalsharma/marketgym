import { getMarketServices } from "@/lib/market-data/services";
import { handle, ok } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import type { RewardsResponse } from "@/lib/types";

export const GET = handle(async (req) => {
  enforceRateLimit(req, "market");
  const { rewards } = getMarketServices();
  const [incentives, feed] = await Promise.all([rewards.getIncentives(), rewards.getFeed()]);
  return ok<RewardsResponse>({ incentives, feed });
});
