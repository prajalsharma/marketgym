import { getMarketServices } from "@/lib/market-data/services";
import { handle, ok } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import type { WealthBoardResponse } from "@/lib/types";

export const GET = handle(async (req) => {
  enforceRateLimit(req, "market");
  const board = await getMarketServices().wealth.getBoard();
  return ok<WealthBoardResponse>(board);
});
