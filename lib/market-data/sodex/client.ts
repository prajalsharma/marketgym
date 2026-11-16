/**
 * SoDEX public spot market-data client. ONLY `/markets/*` GETs, unsigned.
 * No order, account, transfer or signature code exists anywhere in this app.
 */
import { z } from "zod";
import { getEnv } from "@/lib/config/env";
import { fetchJson, UpstreamError } from "../http";
import { envelope, orderBook, spotSymbols, spotTickers, type OrderBookRaw, type SpotSymbol, type SpotTicker } from "./schemas";

export interface SoDEXClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

const SYMBOL_RE = /^[A-Za-z0-9]+_[A-Za-z0-9]+$/;

export class SoDEXClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch | undefined;

  constructor(opts: SoDEXClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.fetchImpl = opts.fetchImpl;
  }

  url(path: string, query?: Record<string, string | number | undefined>): string {
    if (!path.startsWith("markets/")) throw new Error("SoDEX adapter only calls /markets/* endpoints");
    const u = new URL(`${this.baseUrl}/${path}`);
    if (query) for (const [k, v] of Object.entries(query)) if (v !== undefined) u.searchParams.set(k, String(v));
    return u.toString();
  }

  private async get<T>(path: string, schema: z.ZodType<T>, query?: Record<string, string | number | undefined>): Promise<T> {
    const url = this.url(path, query);
    const res = await fetchJson(url, { provider: "sodex", ...(this.fetchImpl ? { fetchImpl: this.fetchImpl } : {}) });
    const env = envelope.safeParse(res.body);
    if (!env.success) {
      console.warn(`[market-data] sodex unexpected envelope for ${path}`);
      throw new UpstreamError("sodex", "malformed", "unexpected response envelope", res.status);
    }
    if (env.data.code !== 0) {
      // errors arrive as HTTP 200 with code !== 0 (e.g. -1 "symbol not found")
      console.warn(`[market-data] sodex provider error code=${env.data.code} for ${path}: ${env.data.error ?? "no message"}`);
      throw new UpstreamError("sodex", "provider_error", env.data.error === "symbol not found" ? "symbol not found" : `provider code ${env.data.code}`, res.status);
    }
    const parsed = schema.safeParse(env.data.data);
    if (!parsed.success) {
      console.warn(`[market-data] sodex payload failed validation for ${path}: ${parsed.error.issues[0]?.message ?? "schema mismatch"}`);
      throw new UpstreamError("sodex", "malformed", "payload failed schema validation", res.status);
    }
    return parsed.data;
  }

  listSymbols(): Promise<SpotSymbol[]> {
    return this.get("markets/symbols", spotSymbols);
  }

  getOrderBook(symbol: string, limit = 20): Promise<OrderBookRaw> {
    if (!SYMBOL_RE.test(symbol)) throw new UpstreamError("sodex", "provider_error", "symbol not found");
    return this.get(`markets/${encodeURIComponent(symbol)}/orderbook`, orderBook, { limit: Math.min(1000, Math.max(1, Math.floor(limit))) });
  }

  getTickers(symbol?: string): Promise<SpotTicker[]> {
    return this.get("markets/tickers", spotTickers, symbol ? { symbol } : undefined);
  }
}

let defaultClient: SoDEXClient | null = null;

/** Configured client, or null in DEMO_MODE. */
export function getSoDEXClient(): SoDEXClient | null {
  const env = getEnv();
  if (!env.sodexEnabled) return null;
  if (!defaultClient) defaultClient = new SoDEXClient({ baseUrl: env.SODEX_MARKET_DATA_BASE_URL });
  return defaultClient;
}

/** test helper */
export function resetSoDEXClient(): void {
  defaultClient = null;
}
