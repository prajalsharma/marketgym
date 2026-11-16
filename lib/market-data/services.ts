/**
 * Market-data services. Each get*() returns normalised contract types and
 * falls back live → cached (stale, with note) → demo (never silently: the
 * provenance says "demo" and carries a note with the reason).
 */
import { getEnv } from "@/lib/config/env";
import { ApiError } from "@/lib/server/api";
import type { EtfFlowSeries, IndexSnapshot, MarketSnapshot, NewsCategory, NewsEvidence, OrderBookSnapshot } from "@/lib/types";
import { marketDataCache, TTL, type MarketDataCache } from "./cache";
import { demoEtfFlows, demoIndexes, demoNews, demoOrderBook, demoSnapshot, demoSymbols } from "./fixtures";
import { UpstreamError } from "./http";
import { getSoDEXClient, type SoDEXClient } from "./sodex/client";
import { toOrderBookSnapshot, toSymbolMeta, type SymbolMeta } from "./sodex/normalise";
import { getSoSoValueClient, type SoSoValueClient } from "./sosovalue/client";
import { ASSET_NAMES, macroDayToNews, toEtfFlowSeries, toIndexSnapshot, toMarketSnapshot, toNewsEvidence } from "./sosovalue/normalise";

export interface ServiceDeps {
  cache?: MarketDataCache;
  sosovalue?: SoSoValueClient | null;
  sodex?: SoDEXClient | null;
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

  constructor(deps: ServiceDeps = {}) {
    this.cache = deps.cache ?? marketDataCache;
    this.now = deps.now ?? Date.now;
    this.clientOverride = deps.sodex;
  }

  private client(): SoDEXClient | null {
    return this.clientOverride !== undefined ? this.clientOverride : getSoDEXClient();
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

  async getOrderBook(market: string, limit = 20): Promise<OrderBookSnapshot> {
    const client = this.client();
    if (!client) return this.demo(market, limit, null);
    const symbols = await this.listMarkets();
    const meta = symbols.find((s) => s.name === market);
    if (!meta) throw new ApiError("not_found", `Market ${market} is not listed on SoDEX spot.`);
    try {
      const res = await this.cache.get({
        key: `sodex:orderbook:${market}:${limit}`,
        ttlMs: TTL.orderbook,
        provider: "sodex",
        sourceUrl: client.url(`markets/${market}/orderbook`, { limit }),
        fetch: () => client.getOrderBook(market, limit),
        asOf: (raw) => new Date(raw.blockTime).toISOString(),
        now: this.now,
      });
      return toOrderBookSnapshot(meta, res.value, res.provenance);
    } catch (err) {
      if (err instanceof UpstreamError && err.kind === "provider_error" && err.message.includes("symbol not found")) {
        throw new ApiError("not_found", `Market ${market} is not listed on SoDEX spot.`);
      }
      warn("sodex", `orderbook ${market}`, err);
      return this.demo(market, limit, err);
    }
  }

  private demo(market: string, limit: number, err: unknown | null): OrderBookSnapshot {
    const d = demoOrderBook(market, limit, demoReason("sodex", err));
    if (!d) {
      if (err !== null) throw new ApiError("upstream_unavailable", `Order book for ${market} is unavailable right now (${describe(err)}).`);
      throw new ApiError("not_found", `No demo order book for ${market}; demo mode supports vBTC_vUSDC and vETH_vUSDC.`);
    }
    return d;
  }
}

// ---------- shared default instances ----------

let defaults: {
  snapshots: MarketSnapshotService;
  news: NewsFeedService;
  etf: ETFDataService;
  indexes: IndexDataService;
  orderBooks: OrderBookService;
} | null = null;

export function getMarketServices() {
  if (!defaults) {
    defaults = {
      snapshots: new MarketSnapshotService(),
      news: new NewsFeedService(),
      etf: new ETFDataService(),
      indexes: new IndexDataService(),
      orderBooks: new OrderBookService(),
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
