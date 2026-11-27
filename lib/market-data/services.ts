/**
 * Market-data services. Each get*() returns normalised contract types and
 * falls back live → cached (stale, with note) → demo (never silently: the
 * provenance says "demo" and carries a note with the reason).
 */
import { getEnv } from "@/lib/config/env";
import { ApiError } from "@/lib/server/api";
import type {
  DataProvenance,
  DcaSimulation,
  EtfFlowSeries,
  IndexSnapshot,
  MarketSnapshot,
  NewsCategory,
  NewsEvidence,
  OrderBookSnapshot,
  RewardFeed,
  RewardsIncentives,
  WealthFund,
  WealthPriceSeries,
  WealthQuote,
} from "@/lib/types";
import { marketDataCache, TTL, type MarketDataCache } from "./cache";
import { demoEtfFlows, demoIndexes, demoNews, demoOrderBook, demoPerpsSymbols, demoSnapshot, demoSymbols } from "./fixtures";
import { UpstreamError } from "./http";
import { FUND_ID_RE } from "./sodex/allow-list";
import { getSoDEXClient, getSoDEXPerpsClient, type SoDEXClient } from "./sodex/client";
import { isPerpsMarket, PERPS_PREFIX, toOrderBookSnapshot, toPerpsSymbolMeta, toSymbolMeta, type SymbolMeta } from "./sodex/normalise";
import { getSoDEXPublicClient, type SoDEXPublicClient } from "./sodex/public-client";
import {
  dcaFromPrices,
  toDcaSimulation,
  toRewardFeed,
  toRewardsIncentives,
  toWealthFund,
  toWealthPriceSeries,
  toWealthQuote,
  type DcaRange,
  type PriceRange,
} from "./sodex/wealth-normalise";
import type { LotteryMetaRaw, VolumeWeightsRaw, WeekInfoRaw } from "./sodex/wealth-schemas";
import { demoDca, demoPriceHistory, demoRewardFeed, demoRewardsIncentives, demoWealthBoard, demoWealthFund } from "./wealth-fixtures";
import { getSoSoValueClient, type SoSoValueClient } from "./sosovalue/client";
import { ASSET_NAMES, macroDayToNews, toEtfFlowSeries, toIndexSnapshot, toMarketSnapshot, toNewsEvidence } from "./sosovalue/normalise";

export interface ServiceDeps {
  cache?: MarketDataCache;
  sosovalue?: SoSoValueClient | null;
  sodex?: SoDEXClient | null;
  /** perps market-data client (same gateway, /perps) */
  sodexPerps?: SoDEXClient | null;
  /** wealth + rewards public-read client (gateway root) */
  sodexPublic?: SoDEXPublicClient | null;
  now?: () => number;
}

function describe(err: unknown): string {
  if (err instanceof UpstreamError) return `${err.provider} ${err.kind}${err.status !== null ? ` ${err.status}` : ""}`;
  return err instanceof Error ? err.message : "unknown error";
}

function demoReason(provider: "sosovalue" | "sodex", err: unknown | null): string {
  if (err === null) {
    return provider === "sosovalue" ? "Demo fixture: no SoSoValue API key configured (or DEMO_MODE)." : "Demo fixture: DEMO_MODE is on.";
  }
  return `Demo fixture: ${provider} unavailable (${describe(err)}) and no cached copy.`;
}

function warn(provider: string, what: string, err: unknown): void {
  console.warn(`[market-data] ${provider} ${what} failed: ${describe(err)}`);
}

// ---------- SoSoValue-backed ----------

abstract class SoSoValueBacked {
  protected readonly cache: MarketDataCache;
  protected readonly now: () => number;
  private readonly clientOverride: SoSoValueClient | null | undefined;

  constructor(deps: ServiceDeps = {}) {
    this.cache = deps.cache ?? marketDataCache;
    this.now = deps.now ?? Date.now;
    this.clientOverride = deps.sosovalue;
  }

  protected client(): SoSoValueClient | null {
    return this.clientOverride !== undefined ? this.clientOverride : getSoSoValueClient();
  }

  /** symbol (upper) → { id, name }, cached 1 h */
  protected async currencyIndex(client: SoSoValueClient): Promise<Record<string, { id: string; name: string }>> {
    const res = await this.cache.get({
      key: "sosovalue:currencies",
      ttlMs: TTL.currencies,
      provider: "sosovalue",
      sourceUrl: client.url("currencies"),
      fetch: () => client.listCurrencies(),
      now: this.now,
    });
    const index: Record<string, { id: string; name: string }> = {};
    for (const c of res.value) {
      const sym = c.symbol.toUpperCase();
      if (!(sym in index)) index[sym] = { id: c.currency_id, name: c.name || ASSET_NAMES[sym] || sym };
    }
    return index;
  }
}

export class MarketSnapshotService extends SoSoValueBacked {
  async getSnapshots(assets: string[]): Promise<MarketSnapshot[]> {
    const wanted = [...new Set(assets.map((a) => a.toUpperCase()))];
    const client = this.client();
    const out: MarketSnapshot[] = [];
    for (const asset of wanted) {
      out.push(await this.getSnapshot(asset, client));
    }
    return out;
  }

  async getSnapshot(asset: string, client: SoSoValueClient | null = this.client()): Promise<MarketSnapshot> {
    const a = asset.toUpperCase();
    if (!client) return this.demo(a, null);
    try {
      const index = await this.currencyIndex(client);
      const entry = index[a];
      if (!entry) throw new ApiError("not_found", `Asset ${a} is not listed by the provider.`);
      const res = await this.cache.get({
        key: `sosovalue:snapshot:${a}`,
        ttlMs: TTL.snapshot,
        provider: "sosovalue",
        sourceUrl: client.url(`currencies/${entry.id}/market-snapshot`),
        fetch: () => client.getCurrencySnapshot(entry.id),
        now: this.now,
      });
      return toMarketSnapshot(a, res.value, res.provenance, entry.name);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      warn("sosovalue", `snapshot ${a}`, err);
      return this.demo(a, err);
    }
  }

  private demo(asset: string, err: unknown | null): MarketSnapshot {
    const d = demoSnapshot(asset, demoReason("sosovalue", err));
    if (!d) throw new ApiError("not_found", `No demo data for asset ${asset}; demo mode supports BTC and ETH.`);
    return d;
  }
}

export class NewsFeedService extends SoSoValueBacked {
  async getNews(opts: { limit?: number; category?: NewsCategory } = {}): Promise<NewsEvidence[]> {
    const limit = opts.limit ?? 12;
    const client = this.client();
    if (!client) return demoNews(limit, opts.category, demoReason("sosovalue", null));
    try {
      const res = await this.cache.get({
        key: "sosovalue:news:pick",
        ttlMs: TTL.news,
        provider: "sosovalue",
        sourceUrl: client.url("news/pick", { page: 1, page_size: 20 }),
        fetch: () => client.getFeaturedNews(20),
        now: this.now,
      });
      let items = res.value.map((i) => toNewsEvidence(i, res.provenance));
      if (opts.category === "macro") {
        // macro calendar supplements the feed when macro evidence is requested
        try {
          const macro = await this.cache.get({
            key: "sosovalue:macro:events",
            ttlMs: TTL.news,
            provider: "sosovalue",
            sourceUrl: client.url("macro/events"),
            fetch: () => client.getMacroEvents(),
            now: this.now,
          });
          items = [...items, ...macro.value.slice(0, 5).map((d) => macroDayToNews(d, macro.provenance))];
        } catch (err) {
          warn("sosovalue", "macro events", err);
        }
      }
      if (opts.category) {
        const match = items.filter((n) => n.category === opts.category);
        const rest = items.filter((n) => n.category !== opts.category);
        items = [...match, ...rest];
      }
      return items.slice(0, limit);
    } catch (err) {
      warn("sosovalue", "news", err);
      return demoNews(limit, opts.category, demoReason("sosovalue", err));
    }
  }
}

export class ETFDataService extends SoSoValueBacked {
  async getFlows(asset: "BTC" | "ETH"): Promise<EtfFlowSeries> {
    const client = this.client();
    if (!client) return demoEtfFlows(asset, demoReason("sosovalue", null));
    try {
      const res = await this.cache.get({
        key: `sosovalue:etf:${asset}`,
        ttlMs: TTL.etf,
        provider: "sosovalue",
        sourceUrl: client.url("etfs/summary-history", { symbol: asset, country_code: "US", limit: 30 }),
        fetch: () => client.getEtfSummaryHistory(asset, 30),
        asOf: (rows) => {
          const latest = rows.find((r) => r.total_net_inflow !== null);
          return latest ? `${latest.date}T00:00:00.000Z` : undefined;
        },
        now: this.now,
      });
      return toEtfFlowSeries(asset, res.value, res.provenance);
    } catch (err) {
      warn("sosovalue", `etf ${asset}`, err);
      return demoEtfFlows(asset, demoReason("sosovalue", err));
    }
  }
}

const MAX_INDEXES = 4;

export class IndexDataService extends SoSoValueBacked {
  async getIndexes(): Promise<IndexSnapshot[]> {
    const client = this.client();
    if (!client) return demoIndexes(demoReason("sosovalue", null));
    try {
      const list = await this.cache.get({
        key: "sosovalue:indices",
        ttlMs: TTL.indexes,
        provider: "sosovalue",
        sourceUrl: client.url("indices"),
        fetch: () => client.listIndices(),
        now: this.now,
      });
      let names: Record<string, string> = {};
      try {
        const idx = await this.currencyIndex(client);
        names = Object.fromEntries(Object.entries(idx).map(([sym, v]) => [sym, v.name]));
      } catch (err) {
        warn("sosovalue", "currency names", err);
      }
      const out: IndexSnapshot[] = [];
      for (const ticker of list.value.slice(0, MAX_INDEXES)) {
        try {
          const res = await this.cache.get({
            key: `sosovalue:index:${ticker.toLowerCase()}`,
            ttlMs: TTL.indexes,
            provider: "sosovalue",
            sourceUrl: client.url(`indices/${ticker}/market-snapshot`),
            fetch: async () => {
              const [constituents, snapshot] = await Promise.all([client.getIndexConstituents(ticker), client.getIndexSnapshot(ticker)]);
              return { constituents, snapshot };
            },
            now: this.now,
          });
          out.push(toIndexSnapshot(ticker, res.value.constituents, res.value.snapshot, res.provenance, names));
        } catch (err) {
          warn("sosovalue", `index ${ticker}`, err);
        }
      }
      if (out.length === 0) throw new UpstreamError("sosovalue", "provider_error", "no index could be loaded");
      return out;
    } catch (err) {
      warn("sosovalue", "indexes", err);
      return demoIndexes(demoReason("sosovalue", err));
    }
  }
}

// ---------- SoDEX-backed ----------

export class OrderBookService {
  private readonly cache: MarketDataCache;
  private readonly now: () => number;
  private readonly clientOverride: SoDEXClient | null | undefined;
  private readonly perpsOverride: SoDEXClient | null | undefined;

  constructor(deps: ServiceDeps = {}) {
    this.cache = deps.cache ?? marketDataCache;
    this.now = deps.now ?? Date.now;
    this.clientOverride = deps.sodex;
    this.perpsOverride = deps.sodexPerps;
  }

  private client(): SoDEXClient | null {
    return this.clientOverride !== undefined ? this.clientOverride : getSoDEXClient();
  }

  private perpsClient(): SoDEXClient | null {
    return this.perpsOverride !== undefined ? this.perpsOverride : getSoDEXPerpsClient();
  }

  async listMarkets(): Promise<SymbolMeta[]> {
    const client = this.client();
    if (!client) return demoSymbols();
    try {
      const res = await this.cache.get({
        key: "sodex:symbols",
        ttlMs: TTL.symbols,
        provider: "sodex",
        sourceUrl: client.url("markets/symbols"),
        fetch: () => client.listSymbols(),
        now: this.now,
      });
      return res.value.map(toSymbolMeta);
    } catch (err) {
      warn("sodex", "symbols", err);
      return demoSymbols();
    }
  }

  /** perps markets, addressed as "perps:<SYMBOL>" */
  async listPerpsMarkets(): Promise<SymbolMeta[]> {
    const client = this.perpsClient();
    if (!client) return demoPerpsSymbols();
    try {
      const res = await this.cache.get({
        key: "sodex:perps:symbols",
        ttlMs: TTL.symbols,
        provider: "sodex",
        sourceUrl: client.url("markets/symbols"),
        fetch: () => client.listSymbols(),
        now: this.now,
      });
      return res.value.map(toPerpsSymbolMeta);
    } catch (err) {
      warn("sodex", "perps symbols", err);
      return demoPerpsSymbols();
    }
  }

  /** Spot ("vANT_vUSDC") or perps ("perps:ANT-USD") book. */
  get(market: string, limit = 20): Promise<OrderBookSnapshot> {
    return this.getOrderBook(market, limit);
  }

  async getOrderBook(market: string, limit = 20): Promise<OrderBookSnapshot> {
    const perps = isPerpsMarket(market);
    const venue = perps ? "perps" : "spot";
    const client = perps ? this.perpsClient() : this.client();
    if (!client) return this.demo(market, limit, null);
    const symbols = perps ? await this.listPerpsMarkets() : await this.listMarkets();
    const meta = symbols.find((s) => s.name === market);
    if (!meta) throw new ApiError("not_found", `Market ${market} is not listed on SoDEX ${venue}.`);
    const wire = perps ? market.slice(PERPS_PREFIX.length) : market;
    try {
      const res = await this.cache.get({
        key: perps ? `sodex:perps:orderbook:${wire}:${limit}` : `sodex:orderbook:${market}:${limit}`,
        ttlMs: perps ? TTL.perpsOrderbook : TTL.orderbook,
        provider: "sodex",
        sourceUrl: client.url(`markets/${wire}/orderbook`, { limit }),
        fetch: () => client.getOrderBook(wire, limit),
        asOf: (raw) => new Date(raw.blockTime).toISOString(),
        now: this.now,
      });
      return toOrderBookSnapshot(meta, res.value, res.provenance);
    } catch (err) {
      if (err instanceof UpstreamError && err.kind === "provider_error" && err.message.includes("symbol not found")) {
        throw new ApiError("not_found", `Market ${market} is not listed on SoDEX ${venue}.`);
      }
      warn("sodex", `orderbook ${market}`, err);
      return this.demo(market, limit, err);
    }
  }

  private demo(market: string, limit: number, err: unknown | null): OrderBookSnapshot {
    const d = demoOrderBook(market, limit, demoReason("sodex", err));
    if (!d) {
      if (err !== null) throw new ApiError("upstream_unavailable", `Order book for ${market} is unavailable right now (${describe(err)}).`);
      throw new ApiError("not_found", `No demo order book for ${market}; demo mode supports vBTC_vUSDC, vETH_vUSDC, vANT_vUSDC and perps:ANT-USD.`);
    }
    return d;
  }
}

// ---------- SoDEX Wealth + Rewards (public reads) ----------

function isNotFound(err: unknown): boolean {
  return err instanceof UpstreamError && err.kind === "provider_error" && /not found/.test(err.message);
}

function wealthDemoReason(what: "SoDEX Wealth" | "SoDEX Rewards", err: unknown | null): string {
  return err === null ? "Demo fixture: DEMO_MODE is on." : `Demo fixture: ${what} unavailable (${describe(err)}) and no cached copy.`;
}

function isoOrUndefined(s: string | null | undefined): string | undefined {
  if (!s) return undefined;
  const t = Date.parse(s);
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
}

function withNote(p: DataProvenance, note: string): DataProvenance {
  return { ...p, note: p.note ? `${p.note} ${note}` : note };
}

export interface WealthBoard {
  funds: WealthFund[];
  quotes: WealthQuote[];
}

export type WealthFundWithQuote = WealthFund & { quote: WealthQuote | null };

const COMPUTED_DCA_NOTE =
  "Weekly DCA computed by MarketGym from SoDEX daily closes with SoDEX's published method (equal weekly amount at each week's first session close); SoDEX's DCA endpoint only serves 1Y and 3Y.";

abstract class SoDEXPublicBacked {
  protected readonly cache: MarketDataCache;
  protected readonly now: () => number;
  private readonly clientOverride: SoDEXPublicClient | null | undefined;

  constructor(deps: ServiceDeps = {}) {
    this.cache = deps.cache ?? marketDataCache;
    this.now = deps.now ?? Date.now;
    this.clientOverride = deps.sodexPublic;
  }

  protected client(): SoDEXPublicClient | null {
    return this.clientOverride !== undefined ? this.clientOverride : getSoDEXPublicClient();
  }
}

export class WealthDataService extends SoDEXPublicBacked {
  /** All listed funds + market-board quotes. Escrow-vault fees are filled from (cached) fund detail. */
  async getBoard(): Promise<WealthBoard> {
    const client = this.client();
    if (!client) return demoWealthBoard(wealthDemoReason("SoDEX Wealth", null));
    try {
      const [funds, quotes] = await Promise.all([
        this.cache.get({
          key: "sodex-wealth:funds",
          ttlMs: TTL.wealthBoard,
          provider: "sodex-wealth",
          sourceUrl: client.url("wealth/funds"),
          fetch: () => client.listFunds(),
          now: this.now,
        }),
        this.cache.get({
          key: "sodex-wealth:markets",
          ttlMs: TTL.wealthBoard,
          provider: "sodex-wealth",
          sourceUrl: client.url("wealth/markets"),
          fetch: () => client.getMarketBoard(),
          now: this.now,
        }),
      ]);
      const out = funds.value.map((f) => toWealthFund(f, { ...funds.provenance, ...(isoOrUndefined(f.asOf) ? { asOf: isoOrUndefined(f.asOf)! } : {}) }));
      // only escrow vaults carry fee parameters (clob/bridged chainConfig is null, ssi-v2 is empty)
      await Promise.all(
        out
          .filter((f) => f.fundType === "escrow_vault")
          .map(async (f) => {
            try {
              const d = await this.fundDetail(client, f.fundId);
              const full = toWealthFund(d.value, d.provenance);
              f.managementFeePct = full.managementFeePct;
              f.performanceFeePct = full.performanceFeePct;
            } catch (err) {
              warn("sodex-wealth", `fund detail ${f.fundId} (fees)`, err);
            }
          }),
      );
      const types = new Map(out.map((f) => [f.fundId, f.fundType]));
      const qs = quotes.value.map((q) => toWealthQuote(q, types.get(q.fundId), quotes.provenance));
      return { funds: out, quotes: qs };
    } catch (err) {
      warn("sodex-wealth", "board", err);
      return demoWealthBoard(wealthDemoReason("SoDEX Wealth", err));
    }
  }

  private fundDetail(client: SoDEXPublicClient, fundId: string) {
    return this.cache.get({
      key: `sodex-wealth:fund:${fundId}`,
      ttlMs: TTL.wealthFund,
      provider: "sodex-wealth",
      sourceUrl: client.fundUrl(fundId),
      fetch: () => client.getFund(fundId),
      asOf: (r) => isoOrUndefined(r.asOf),
      now: this.now,
    });
  }

  /** The fund as listed on the (possibly demo) board; not_found otherwise. Unknown ids never reach SoDEX. */
  private async listed(fundId: string): Promise<{ board: WealthBoard; fund: WealthFund }> {
    if (!FUND_ID_RE.test(fundId)) throw new ApiError("not_found", "Fund not found.");
    const board = await this.getBoard();
    const fund = board.funds.find((f) => f.fundId === fundId);
    if (!fund) throw new ApiError("not_found", `Fund ${fundId} is not listed on SoDEX Wealth.`);
    return { board, fund };
  }

  async getFund(fundId: string): Promise<WealthFundWithQuote> {
    const { board, fund } = await this.listed(fundId);
    const quote = board.quotes.find((q) => q.fundId === fundId) ?? null;
    const client = this.client();
    if (!client) return demoWealthFund(fundId, fund.provenance.note) ?? { ...fund, quote };
    try {
      const res = await this.fundDetail(client, fundId);
      return { ...toWealthFund(res.value, res.provenance), quote };
    } catch (err) {
      if (isNotFound(err)) throw new ApiError("not_found", `Fund ${fundId} is not listed on SoDEX Wealth.`);
      warn("sodex-wealth", `fund ${fundId}`, err);
      if (fund.provenance.kind === "demo") return demoWealthFund(fundId, wealthDemoReason("SoDEX Wealth", err)) ?? { ...fund, quote };
      return { ...fund, provenance: withNote(fund.provenance, `Fund detail unavailable (${describe(err)}); fees unknown.`), quote };
    }
  }

  private priceRaw(client: SoDEXPublicClient, fundId: string, range: PriceRange) {
    return this.cache.get({
      key: `sodex-wealth:price:${fundId}:${range}`,
      ttlMs: TTL.wealthPrice,
      provider: "sodex-wealth",
      sourceUrl: client.priceHistoryUrl(fundId, range),
      fetch: () => client.getPriceHistory(fundId, range),
      now: this.now,
    });
  }

  async getPriceHistory(fundId: string, range: PriceRange): Promise<WealthPriceSeries> {
    await this.listed(fundId);
    const client = this.client();
    if (!client) return this.demoPrice(fundId, range, null);
    try {
      const res = await this.priceRaw(client, fundId, range);
      return toWealthPriceSeries(res.value, range, res.provenance);
    } catch (err) {
      if (isNotFound(err)) throw new ApiError("not_found", `Fund ${fundId} is not listed on SoDEX Wealth.`);
      warn("sodex-wealth", `price history ${fundId} ${range}`, err);
      return this.demoPrice(fundId, range, err);
    }
  }

  /** 1Y from SoDEX's dca-history; 3M/6M computed from the 1Y daily closes (SoDEX serves 1Y/3Y only). */
  async getDca(fundId: string, range: DcaRange): Promise<DcaSimulation> {
    await this.listed(fundId);
    const client = this.client();
    if (!client) return this.demoDca(fundId, range, null);
    try {
      if (range === "1Y") {
        const res = await this.cache.get({
          key: `sodex-wealth:dca:${fundId}:1Y`,
          ttlMs: TTL.wealthDca,
          provider: "sodex-wealth",
          sourceUrl: client.dcaHistoryUrl(fundId, "1Y"),
          fetch: () => client.getDcaHistory(fundId, "1Y"),
          now: this.now,
        });
        return toDcaSimulation(res.value, "1Y", res.provenance);
      }
      const res = await this.priceRaw(client, fundId, "1Y");
      const prov = withNote(res.provenance, COMPUTED_DCA_NOTE);
      return dcaFromPrices(fundId, toWealthPriceSeries(res.value, "1Y", prov).points, range, prov);
    } catch (err) {
      if (isNotFound(err)) throw new ApiError("not_found", `Fund ${fundId} is not listed on SoDEX Wealth.`);
      warn("sodex-wealth", `dca ${fundId} ${range}`, err);
      return this.demoDca(fundId, range, err);
    }
  }

  private demoPrice(fundId: string, range: PriceRange, err: unknown | null): WealthPriceSeries {
    const d = demoPriceHistory(fundId, range, wealthDemoReason("SoDEX Wealth", err));
    if (d) return d;
    if (err !== null) throw new ApiError("upstream_unavailable", `Price history for ${fundId} is unavailable right now (${describe(err)}).`);
    throw new ApiError("not_found", `No demo price history for ${fundId} ${range}; demo mode covers vQQQ, vVOO and antb (1M).`);
  }

  private demoDca(fundId: string, range: DcaRange, err: unknown | null): DcaSimulation {
    const d = demoDca(fundId, range, wealthDemoReason("SoDEX Wealth", err));
    if (d) return d;
    if (err !== null) throw new ApiError("upstream_unavailable", `DCA simulation for ${fundId} is unavailable right now (${describe(err)}).`);
    throw new ApiError("not_found", `No demo DCA simulation for ${fundId}; demo mode covers vQQQ and vVOO.`);
  }
}

export class RewardsDataService extends SoDEXPublicBacked {
  async getIncentives(): Promise<RewardsIncentives> {
    const client = this.client();
    if (!client) return demoRewardsIncentives(wealthDemoReason("SoDEX Rewards", null));
    try {
      const res = await this.cache.get<{ weights: VolumeWeightsRaw; week: WeekInfoRaw; meta: LotteryMetaRaw }>({
        key: "sodex-rewards:incentives",
        ttlMs: TTL.rewardsIncentives,
        provider: "sodex-rewards",
        sourceUrl: client.url("sopoints/volume-weights"),
        fetch: async () => {
          const [weights, week, meta] = await Promise.all([client.getVolumeWeights(), client.getWeekInfo(), client.getLotteryMeta()]);
          return { weights, week, meta };
        },
        now: this.now,
      });
      return toRewardsIncentives(res.value.weights, res.value.week, res.value.meta, res.provenance);
    } catch (err) {
      warn("sodex-rewards", "incentives", err);
      return demoRewardsIncentives(wealthDemoReason("SoDEX Rewards", err));
    }
  }

  async getFeed(): Promise<RewardFeed> {
    const client = this.client();
    if (!client) return demoRewardFeed(wealthDemoReason("SoDEX Rewards", null));
    try {
      const res = await this.cache.get({
        key: "sodex-rewards:feed",
        ttlMs: TTL.rewardsFeed,
        provider: "sodex-rewards",
        sourceUrl: client.url("lottery/feed"),
        fetch: () => client.getLotteryFeed(),
        now: this.now,
      });
      return toRewardFeed(res.value, res.provenance);
    } catch (err) {
      warn("sodex-rewards", "feed", err);
      return demoRewardFeed(wealthDemoReason("SoDEX Rewards", err));
    }
  }
}

// ---------- shared default instances ----------

let defaults: {
  snapshots: MarketSnapshotService;
  news: NewsFeedService;
  etf: ETFDataService;
  indexes: IndexDataService;
  orderBooks: OrderBookService;
  wealth: WealthDataService;
  rewards: RewardsDataService;
} | null = null;

export function getMarketServices() {
  if (!defaults) {
    defaults = {
      snapshots: new MarketSnapshotService(),
      news: new NewsFeedService(),
      etf: new ETFDataService(),
      indexes: new IndexDataService(),
      orderBooks: new OrderBookService(),
      wealth: new WealthDataService(),
      rewards: new RewardsDataService(),
    };
  }
  return defaults;
}

/** test helper */
export function resetMarketServices(): void {
  defaults = null;
  marketDataCache.clear();
}

/** Whether live calls are even attempted (for UI labels). */
export function marketDataMode(): { sosovalue: "live" | "demo"; sodex: "live" | "demo" } {
  const env = getEnv();
  return { sosovalue: env.sosovalueEnabled ? "live" : "demo", sodex: env.sodexEnabled ? "live" : "demo" };
}
