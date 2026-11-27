/**
 * SoDEX Wealth + Rewards public reads. Unsigned GETs only, every URL checked
 * against ./allow-list.ts. No wallet, auth, deposit, redemption, RFQ, order
 * or claim endpoint is reachable from here.
 */
import { getEnv } from "@/lib/config/env";
import { UpstreamError } from "../http";
import { FUND_ID_RE, gatewayRoot } from "./allow-list";
import { buildSodexUrl, getEnveloped } from "./client";
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
  type LotteryFeedRaw,
  type LotteryMetaRaw,
  type VolumeWeightsRaw,
  type WealthDcaHistoryRaw,
  type WealthFundDetailRaw,
  type WealthFundRaw,
  type WealthPriceHistoryRaw,
  type WeekInfoRaw,
} from "./wealth-schemas";

export interface SoDEXPublicClientOptions {
  /** gateway root, e.g. "https://mainnet-gw.sodex.dev/api/v1" */
  rootUrl: string;
  fetchImpl?: typeof fetch;
}

type Query = Record<string, string | number | undefined>;

export class SoDEXPublicClient {
  private readonly rootUrl: string;
  private readonly fetchImpl: typeof fetch | undefined;

  constructor(opts: SoDEXPublicClientOptions) {
    this.rootUrl = opts.rootUrl.replace(/\/+$/, "");
    this.fetchImpl = opts.fetchImpl;
  }

  /** relative path (e.g. "wealth/funds") → allow-listed absolute URL; throws otherwise */
  url(path: string, query?: Query): string {
    return buildSodexUrl(this.rootUrl, path, query);
  }

  private fundPath(fundId: string, suffix = ""): string {
    if (!FUND_ID_RE.test(fundId)) throw new UpstreamError("sodex", "provider_error", "not found");
    return `wealth/funds/${encodeURIComponent(fundId)}${suffix}`;
  }

  fundUrl(fundId: string): string {
    return this.url(this.fundPath(fundId));
  }

  priceHistoryUrl(fundId: string, range: string): string {
    return this.url(this.fundPath(fundId, "/price-history"), { interval: "1d", range, type: "line" });
  }

  dcaHistoryUrl(fundId: string, range: string): string {
    return this.url(this.fundPath(fundId, "/dca-history"), { range });
  }

  listFunds(): Promise<WealthFundRaw[]> {
    return getEnveloped(this.url("wealth/funds"), "wealth/funds", wealthFundList, this.fetchImpl);
  }

  getFund(fundId: string): Promise<WealthFundDetailRaw> {
    return getEnveloped(this.fundUrl(fundId), "wealth/funds/{id}", wealthFundDetail, this.fetchImpl);
  }

  async getMarketBoard() {
    return (await getEnveloped(this.url("wealth/markets"), "wealth/markets", wealthMarkets, this.fetchImpl)).quotes;
  }

  getPriceHistory(fundId: string, range: string): Promise<WealthPriceHistoryRaw> {
    return getEnveloped(this.priceHistoryUrl(fundId, range), "wealth/funds/{id}/price-history", wealthPriceHistory, this.fetchImpl);
  }

  /** SoDEX serves 1Y and 3Y only ("invalid parameter: range" otherwise). */
  getDcaHistory(fundId: string, range: "1Y" | "3Y"): Promise<WealthDcaHistoryRaw> {
    return getEnveloped(this.dcaHistoryUrl(fundId, range), "wealth/funds/{id}/dca-history", wealthDcaHistory, this.fetchImpl);
  }

  getVolumeWeights(): Promise<VolumeWeightsRaw> {
    return getEnveloped(this.url("sopoints/volume-weights"), "sopoints/volume-weights", volumeWeights, this.fetchImpl);
  }

  getWeekInfo(): Promise<WeekInfoRaw> {
    return getEnveloped(this.url("sopoints/week/info"), "sopoints/week/info", weekInfo, this.fetchImpl);
  }

  getLotteryMeta(): Promise<LotteryMetaRaw> {
    return getEnveloped(this.url("lottery/meta"), "lottery/meta", lotteryMeta, this.fetchImpl);
  }

  getLotteryFeed(): Promise<LotteryFeedRaw> {
    return getEnveloped(this.url("lottery/feed"), "lottery/feed", lotteryFeed, this.fetchImpl);
  }
}

let defaultClient: SoDEXPublicClient | null = null;

/** Configured client, or null in DEMO_MODE. */
export function getSoDEXPublicClient(): SoDEXPublicClient | null {
  const env = getEnv();
  if (!env.sodexEnabled) return null;
  if (!defaultClient) defaultClient = new SoDEXPublicClient({ rootUrl: gatewayRoot(env.SODEX_MARKET_DATA_BASE_URL) });
  return defaultClient;
}

/** test helper */
export function resetSoDEXPublicClient(): void {
  defaultClient = null;
}
