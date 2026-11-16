/**
 * SoSoValue OpenAPI v1 client. Server-only, read-only GETs, `x-soso-api-key`
 * header, 20 req/min token bucket, every payload Zod-validated.
 */
import { z } from "zod";
import { getEnv } from "@/lib/config/env";
import { fetchJson, UpstreamError } from "../http";
import { TokenBucket } from "../token-bucket";
import {
  currencyList,
  currencySnapshot,
  envelope,
  etfSummaryHistory,
  indexConstituents,
  indexList,
  indexSnapshot,
  macroEvents,
  marketOverview,
  newsPage,
  type CurrencyListItem,
  type CurrencySnapshot,
  type EtfSummaryRow,
  type IndexConstituentRaw,
  type IndexSnapshotRaw,
  type MacroEventDay,
  type MarketOverview,
  type NewsItem,
} from "./schemas";

export interface SoSoValueClientOptions {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
  bucket?: TokenBucket;
  now?: () => number;
}

export type Query = Record<string, string | number | undefined>;

export class SoSoValueClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch | undefined;
  private readonly bucket: TokenBucket;
  private readonly now: () => number;

  constructor(opts: SoSoValueClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.apiKey = opts.apiKey;
    this.fetchImpl = opts.fetchImpl;
    this.bucket = opts.bucket ?? new TokenBucket(20, 60_000);
    this.now = opts.now ?? Date.now;
  }

  url(path: string, query?: Query): string {
    const u = new URL(`${this.baseUrl}/${path.replace(/^\/+/, "")}`);
    if (query) for (const [k, v] of Object.entries(query)) if (v !== undefined) u.searchParams.set(k, String(v));
    return u.toString();
  }

  private async get<T>(path: string, schema: z.ZodType<T>, query?: Query): Promise<T> {
    if (!this.bucket.tryTake(this.now())) {
      throw new UpstreamError("sosovalue", "budget", `local request budget exhausted; retry in ${this.bucket.msUntilNext(this.now())} ms`, null, this.bucket.msUntilNext(this.now()));
    }
    const url = this.url(path, query);
    const res = await fetchJson(url, {
      provider: "sosovalue",
      headers: { "x-soso-api-key": this.apiKey },
      ...(this.fetchImpl ? { fetchImpl: this.fetchImpl } : {}),
    });
    const env = envelope.safeParse(res.body);
    if (!env.success) {
      console.warn(`[market-data] sosovalue unexpected envelope for ${path}`);
      throw new UpstreamError("sosovalue", "malformed", "unexpected response envelope", res.status);
    }
    if (env.data.code !== 0) {
      console.warn(`[market-data] sosovalue provider error code=${env.data.code} for ${path}`);
      throw new UpstreamError("sosovalue", "provider_error", `provider code ${env.data.code}`, res.status);
    }
    const parsed = schema.safeParse(env.data.data);
    if (!parsed.success) {
      console.warn(`[market-data] sosovalue payload failed validation for ${path}: ${parsed.error.issues[0]?.message ?? "schema mismatch"}`);
      throw new UpstreamError("sosovalue", "malformed", "payload failed schema validation", res.status);
    }
    return parsed.data;
  }

  listCurrencies(): Promise<CurrencyListItem[]> {
    return this.get("currencies", currencyList);
  }

  getCurrencySnapshot(currencyId: string): Promise<CurrencySnapshot> {
    return this.get(`currencies/${encodeURIComponent(currencyId)}/market-snapshot`, currencySnapshot);
  }

  getMarketOverview(): Promise<MarketOverview> {
    return this.get("market/overview", marketOverview);
  }

  getEtfSummaryHistory(symbol: "BTC" | "ETH", limit = 30): Promise<EtfSummaryRow[]> {
    return this.get("etfs/summary-history", etfSummaryHistory, { symbol, country_code: "US", limit });
  }

  listIndices(): Promise<string[]> {
    return this.get("indices", indexList);
  }

  getIndexConstituents(ticker: string): Promise<IndexConstituentRaw[]> {
    return this.get(`indices/${encodeURIComponent(ticker)}/constituents`, indexConstituents);
  }

  getIndexSnapshot(ticker: string): Promise<IndexSnapshotRaw> {
    return this.get(`indices/${encodeURIComponent(ticker)}/market-snapshot`, indexSnapshot);
  }

  /** page_size must be 20..100 per docs */
  getFeaturedNews(pageSize = 20, category?: number): Promise<NewsItem[]> {
    return this.get("news/pick", newsPage, { page: 1, page_size: Math.min(100, Math.max(20, pageSize)), ...(category !== undefined ? { category } : {}) }).then((p) => p.list);
  }

  getMacroEvents(): Promise<MacroEventDay[]> {
    return this.get("macro/events", macroEvents);
  }
}

let defaultClient: SoSoValueClient | null = null;

/** The configured client, or null when no key / DEMO_MODE. */
export function getSoSoValueClient(): SoSoValueClient | null {
  const env = getEnv();
  if (!env.sosovalueEnabled || !env.SOSOVALUE_API_KEY) return null;
  if (!defaultClient) defaultClient = new SoSoValueClient({ baseUrl: env.SOSOVALUE_BASE_URL, apiKey: env.SOSOVALUE_API_KEY });
  return defaultClient;
}

/** test helper */
export function resetSoSoValueClient(): void {
  defaultClient = null;
}
