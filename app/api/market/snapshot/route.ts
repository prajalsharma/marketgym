import { getMarketServices } from "@/lib/market-data/services";
import { handle, ok, queryObject } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { marketSnapshotQuerySchema } from "@/lib/server/validation";
import type { MarketSnapshotResponse } from "@/lib/types";

export const GET = handle(async (req) => {
  enforceRateLimit(req, "market");
  const { assets } = marketSnapshotQuerySchema.parse(queryObject(req));
  const snapshots = await getMarketServices().snapshots.getSnapshots(assets);
  return ok<MarketSnapshotResponse>(snapshots);
});
