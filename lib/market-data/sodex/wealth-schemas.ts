/**
 * Zod schemas for SoDEX Wealth and Rewards public reads, derived from the
 * captured responses in __fixtures__/sodex/{wealth-*,rewards-*}.json.
 * Decimals arrive as strings (sometimes "" for "not set"); they stay strings
 * here and become numbers in ./wealth-normalise.ts. Unknown fields are
 * stripped (wallets in the lottery feed are never kept).
 */
import { z } from "zod";

/** decimal string, "" (unset) or a plain number */
const loose = z.union([z.string(), z.number()]);
const optLoose = loose.nullish();
const optStr = z.string().nullish();

// ---------- Wealth ----------

export const wealthFundItem = z.object({
  fundId: z.string().min(1),
  name: z.string(),
  fundType: z.string(),
  fundStatus: z.string(),
  nav: optLoose,
  aum: optLoose,
  asOf: optStr,
  iconUrl: optStr,
  tagline: optStr,
  share: z.object({ coin: z.string(), address: optStr, decimals: z.number().nullish() }).nullish(),
  spot: z.object({ symbol: z.string(), symbolId: z.number().nullish(), displayName: optStr }).nullish(),
});
export const wealthFundList = z.array(wealthFundItem);
export type WealthFundRaw = z.infer<typeof wealthFundItem>;

export const wealthFundDetail = wealthFundItem.extend({
  description: optStr,
  issuerName: optStr,
  inceptionDate: optStr,
  chainConfig: z
    .object({
      mgmtFeeRate: optLoose,
      perfFeeRate: optLoose,
      paused: z.boolean().nullish(),
    })
    .nullish(),
});
export type WealthFundDetailRaw = z.infer<typeof wealthFundDetail>;

export const wealthQuote = z.object({
  fundId: z.string().min(1),
  symbol: optStr,
  fundType: optStr,
  currency: optStr,
  price: loose,
  prevClose: optLoose,
  changePct: optLoose,
  roi24h: optLoose,
  roi1M: optLoose,
  roi1Y: optLoose,
  roi3Y: optLoose,
  roiYtd: optLoose,
  roiInception: optLoose,
  dividendYield: optLoose,
  apy24h: optLoose,
  apy7d: optLoose,
  apy1M: optLoose,
  apy1Y: optLoose,
  dayHigh: optLoose,
  dayLow: optLoose,
  dayVolume: optLoose,
  marketStatus: optStr,
  asOf: optStr,
  priceSource: optStr,
  priceStatus: optStr,
});
export const wealthMarkets = z.object({ quotes: z.array(wealthQuote) });
export type WealthQuoteRaw = z.infer<typeof wealthQuote>;

export const wealthPriceHistory = z.object({
  fundId: z.string(),
  symbol: optStr,
  interval: z.string(),
  range: z.string(),
  type: optStr,
  points: z
    .array(z.object({ ts: z.string(), close: loose }))
    .nullish()
    .transform((p) => p ?? []),
  truncated: z.boolean().nullish(),
});
export type WealthPriceHistoryRaw = z.infer<typeof wealthPriceHistory>;

export const wealthDcaHistory = z.object({
  fundId: z.string(),
  range: z.string(),
  returnRate: optLoose,
  points: z
    .array(z.object({ tradeDate: z.string(), returnRate: loose }))
    .nullish()
    .transform((p) => p ?? []),
  ready: z.boolean(),
});
export type WealthDcaHistoryRaw = z.infer<typeof wealthDcaHistory>;

// ---------- Rewards ----------

export const volumeWeights = z.object({
  activity_id: z.number().nullish(),
  round: z.object({ round_id: z.number(), start_ts_ms: z.number().nullish(), end_ts_ms: z.number().nullish() }).nullish(),
  weights: z
    .array(z.object({ market_type: z.string(), symbol_id: z.number().nullish(), symbol: z.string(), coefficient: loose }))
    .nullish()
    .transform((w) => w ?? []),
});
export type VolumeWeightsRaw = z.infer<typeof volumeWeights>;

export const weekInfo = z.object({
  weekNo: z.number().nullish(),
  weekName: optStr,
  weekStatus: optStr,
  weekPoolPoints: optLoose,
  nextWeekStartTime: z.number().nullish(),
  /** epoch SECONDS */
  distributionTime: z.number().nullish(),
});
export type WeekInfoRaw = z.infer<typeof weekInfo>;

export const lotteryMeta = z.object({
  rules: z
    .object({
      volumePerBoxU: optLoose,
      takerWeightBps: optLoose,
      makerWeightBps: optLoose,
      rewardBands: z
        .array(z.object({ level: z.string(), minUsd: loose, maxUsd: loose }))
        .nullish()
        .transform((b) => b ?? []),
    })
    .nullish(),
});
export type LotteryMetaRaw = z.infer<typeof lotteryMeta>;

export const lotteryFeed = z.object({
  minLevel: optStr,
  items: z
    .array(
      z.object({
        kind: optStr,
        tsMs: z.number(),
        level: z.string(),
        rewardUsd: loose,
        reward: z.object({ asset: z.object({ symbol: optStr }).nullish() }).nullish(),
        pfp: z.boolean().nullish(),
      }),
    )
    .nullish()
    .transform((i) => i ?? []),
});
export type LotteryFeedRaw = z.infer<typeof lotteryFeed>;
