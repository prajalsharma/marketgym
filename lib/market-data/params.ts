/**
 * Zod schemas for the public /api/market/* SoDEX routes (wealth, rewards,
 * order book). Kept beside the services so ids/ranges stay in one place.
 */
import { z } from "zod";
import { FUND_ID_RE } from "./sodex/allow-list";
import { PERPS_MARKET_RE, SPOT_MARKET_RE } from "./sodex/normalise";
import { DCA_RANGES, PRICE_RANGES, type DcaRange, type PriceRange } from "./sodex/wealth-normalise";

export const fundIdParam = z.string().trim().regex(FUND_ID_RE, "fundId must look like vQQQ, antb or Morpho-Earn");

export const wealthFundParamsSchema = z.object({ fundId: fundIdParam });

export const wealthPriceQuerySchema = z.object({
  range: z.enum(PRICE_RANGES as [PriceRange, ...PriceRange[]]).default("1M"),
});

export const wealthDcaQuerySchema = z.object({
  range: z.enum(DCA_RANGES as [DcaRange, ...DcaRange[]]).default("1Y"),
});

/** spot "vBTC_vUSDC" / "vANT_vUSDC" or perps "perps:ANT-USD" */
export const orderBookMarketParam = z
  .string()
  .trim()
  .min(3)
  .max(40)
  .refine((m) => SPOT_MARKET_RE.test(m) || PERPS_MARKET_RE.test(m), "market must look like vBTC_vUSDC or perps:ANT-USD");

export const orderBookQuerySchema = z.object({
  market: orderBookMarketParam.default("vBTC_vUSDC"),
  limit: z.coerce.number().int().min(5).max(100).default(20),
});
