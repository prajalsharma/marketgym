/**
 * Deterministic demo data for SoDEX Wealth + Rewards, built from real
 * captured responses in __fixtures__/sodex. provenance.kind is always
 * "demo" (provider "fixture", like the other demo books), fetchedAt = the
 * file's _captured_at. Never labelled live.
 */
import type { DataProvenance, DcaSimulation, RewardFeed, RewardsIncentives, WealthFund, WealthPriceSeries, WealthQuote } from "@/lib/types";
import rewardsFeed from "./__fixtures__/sodex/rewards-lottery-feed.json";
import rewardsMeta from "./__fixtures__/sodex/rewards-lottery-meta.json";
import rewardsWeights from "./__fixtures__/sodex/rewards-volume-weights.json";
import rewardsWeek from "./__fixtures__/sodex/rewards-week-info.json";
import dcaQqq from "./__fixtures__/sodex/wealth-dca-vQQQ.json";
import dcaVoo from "./__fixtures__/sodex/wealth-dca-vVOO.json";
import fundAntb from "./__fixtures__/sodex/wealth-fund-antb.json";
import fundCxmt from "./__fixtures__/sodex/wealth-fund-CXMT.json";
import fundMorpho from "./__fixtures__/sodex/wealth-fund-morpho.json";
import fundUnitree from "./__fixtures__/sodex/wealth-fund-UNITREE.json";
import wealthFunds from "./__fixtures__/sodex/wealth-funds.json";
import wealthMarketsFx from "./__fixtures__/sodex/wealth-markets.json";
import priceAntb1M from "./__fixtures__/sodex/wealth-price-history-antb.json";
import priceQqq1Y from "./__fixtures__/sodex/wealth-price-history-vQQQ-1Y.json";
import priceQqq3M from "./__fixtures__/sodex/wealth-price-history-vQQQ.json";
import priceVoo1Y from "./__fixtures__/sodex/wealth-price-history-vVOO-1Y.json";
import {
  dcaFromPrices,
  sliceSeries,
  toDcaSimulation,
  toRewardFeed,
  toRewardsIncentives,
  toWealthFund,
  toWealthPriceSeries,
  toWealthQuote,
  type DcaRange,
  type PriceRange,
} from "./sodex/wealth-normalise";
import {
  lotteryFeed,
  lotteryMeta,
  volumeWeights,
  wealthDcaHistory,
  wealthFundDetail,
  wealthFundList,
  wealthMarkets,
  wealthPriceHistory,
  weekInfo,
  type WealthFundDetailRaw,
} from "./sodex/wealth-schemas";

export const WEALTH_DEMO_NOTE = "Demo fixture, not real-time market data.";

interface Capture {
  _captured_at: string;
  _source: string;
  data: unknown;
}

function prov(fx: Capture, note: string, asOf?: string | null): DataProvenance {
  return { kind: "demo", provider: "fixture", sourceUrl: fx._source, fetchedAt: fx._captured_at, ...(asOf ? { asOf } : {}), note };
}

const fundList = wealthFundList.parse(wealthFunds.data);
const detailFixtures: Record<string, { fx: Capture; raw: WealthFundDetailRaw }> = Object.fromEntries(
  [fundAntb, fundCxmt, fundMorpho, fundUnitree].map((fx) => {
    const raw = wealthFundDetail.parse(fx.data);
    return [raw.fundId, { fx, raw }];
  }),
);
const quoteRows = wealthMarkets.parse(wealthMarketsFx.data).quotes;

export function demoWealthFundIds(): string[] {
  return fundList.map((f) => f.fundId);
}

/** All demo funds (detail capture when we have one, so fees are filled) + board quotes. */
export function demoWealthBoard(note = WEALTH_DEMO_NOTE): { funds: WealthFund[]; quotes: WealthQuote[] } {
  const funds = fundList.map((f) => {
    const d = detailFixtures[f.fundId];
    return d ? toWealthFund(d.raw, prov(d.fx, note, d.raw.asOf)) : toWealthFund(f, prov(wealthFunds, note, f.asOf));
  });
  const types = new Map(funds.map((f) => [f.fundId, f.fundType]));
  const quotes = quoteRows.map((q) => toWealthQuote(q, types.get(q.fundId), prov(wealthMarketsFx, note, q.asOf)));
  return { funds, quotes };
}

export function demoWealthFund(fundId: string, note = WEALTH_DEMO_NOTE): (WealthFund & { quote: WealthQuote | null }) | null {
  const board = demoWealthBoard(note);
  const fund = board.funds.find((f) => f.fundId === fundId);
  if (!fund) return null;
  return { ...fund, quote: board.quotes.find((q) => q.fundId === fundId) ?? null };
}

const oneYearPrices: Record<string, Capture> = { vQQQ: priceQqq1Y, vVOO: priceVoo1Y };
const exactPrices: Record<string, Capture> = { "antb:1M": priceAntb1M, "vQQQ:3M": priceQqq3M };
const dcaFixtures: Record<string, Capture> = { vQQQ: dcaQqq, vVOO: dcaVoo };

/** demo price series: cut from a full 1Y capture when we have one, else an exact-range capture */
export function demoPriceHistory(fundId: string, range: PriceRange, note = WEALTH_DEMO_NOTE): WealthPriceSeries | null {
  const year = oneYearPrices[fundId];
  if (year) {
    const series = toWealthPriceSeries(wealthPriceHistory.parse(year.data), "1Y", prov(year, range === "1Y" ? note : `${note} Cut from a 1Y capture.`));
    return { ...series, range, points: sliceSeries(series.points, range) };
  }
  const exact = exactPrices[`${fundId}:${range}`];
  if (exact) return toWealthPriceSeries(wealthPriceHistory.parse(exact.data), range, prov(exact, note));
  return null;
}

/**
 * demo DCA: SoDEX's weekly method applied to the full 1Y close capture (the
 * dca-history captures are trimmed to their first 25 weeks, so their points
 * do not reach their own total). Falls back to the dca-history capture.
 */
export function demoDca(fundId: string, range: DcaRange, note = WEALTH_DEMO_NOTE): DcaSimulation | null {
  const year = oneYearPrices[fundId];
  if (year) {
    const series = toWealthPriceSeries(wealthPriceHistory.parse(year.data), "1Y", prov(year, note));
    return dcaFromPrices(fundId, series.points, range, prov(year, `${note} Weekly DCA computed from captured daily closes with SoDEX's published method.`));
  }
  const dca = dcaFixtures[fundId];
  if (dca && range === "1Y") return toDcaSimulation(wealthDcaHistory.parse(dca.data), "1Y", prov(dca, note));
  return null;
}

export function demoRewardsIncentives(note = WEALTH_DEMO_NOTE): RewardsIncentives {
  return toRewardsIncentives(
    volumeWeights.parse(rewardsWeights.data),
    weekInfo.parse(rewardsWeek.data),
    lotteryMeta.parse(rewardsMeta.data),
    prov(rewardsWeights, note),
  );
}

export function demoRewardFeed(note = WEALTH_DEMO_NOTE): RewardFeed {
  return toRewardFeed(lotteryFeed.parse(rewardsFeed.data), prov(rewardsFeed, note));
}
