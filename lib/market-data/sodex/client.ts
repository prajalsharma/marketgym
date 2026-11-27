/**
 * SoDEX public spot/perps market-data client. ONLY `/markets/*` GETs,
 * unsigned, checked against the allow-list in ./allow-list.ts.
 * No order, account, transfer or signature code exists anywhere in this app.
 */
import { z } from "zod";
import { getEnv } from "@/lib/config/env";
import { fetchJson, UpstreamError } from "../http";
import { assertAllowedSodexUrl, gatewayRoot } from "./allow-list";
import { envelope, orderBook, spotSymbols, spotTickers, type OrderBookRaw, type SpotSymbol, type SpotTicker } from "./schemas";

export interface SoDEXClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

/** spot "vBTC_vUSDC" or perps "ANT-USD" */
const SYMBOL_RE = /^[A-Za-z0-9]+[_-][A-Za-z0-9]+$/;

export class SoDEXClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch | undefined;

  constructor(opts: SoDEXClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.fetchImpl = opts.fetchImpl;
  }

  url(path: string, query?: Record<string, string | number | undefined>): string {
    return buildSodexUrl(this.baseUrl, path, query);
  }

  private get<T>(path: string, schema: z.ZodType<T>, query?: Record<string, string | number | undefined>): Promise<T> {
    return getEnveloped(this.url(path, query), path, schema, this.fetchImpl);
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

type Query = Record<string, string | number | undefined>;

/** base + relative path + query → URL string; refuses anything not allow-listed. */
export function buildSodexUrl(baseUrl: string, path: string, query?: Query): string {
  const u = new URL(`${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`);
  assertAllowedSodexUrl(u);
  if (query) for (const [k, v] of Object.entries(query)) if (v !== undefined) u.searchParams.set(k, String(v));
  return u.toString();
}

/**
 * GET an allow-listed SoDEX URL and unwrap its envelope. Spot/perps/wealth
 * use `{code,timestamp,data}`, rewards `{code,msg|message,data}`; errors
 * arrive as HTTP 200 with code !== 0 (e.g. -1 "symbol not found" / "not found").
 */
export async function getEnveloped<T>(url: string, label: string, schema: z.ZodType<T>, fetchImpl?: typeof fetch): Promise<T> {
  assertAllowedSodexUrl(new URL(url));
  const res = await fetchJson(url, { provider: "sodex", ...(fetchImpl ? { fetchImpl } : {}) });
  const env = envelope.safeParse(res.body);
  if (!env.success) {
    console.warn(`[market-data] sodex unexpected envelope for ${label}`);
    throw new UpstreamError("sodex", "malformed", "unexpected response envelope", res.status);
  }
  if (env.data.code !== 0) {
    const msg = env.data.error ?? env.data.msg ?? env.data.message ?? "";
    console.warn(`[market-data] sodex provider error code=${env.data.code} for ${label}: ${msg || "no message"}`);
    const known = msg === "symbol not found" || msg === "not found" ? msg : `provider code ${env.data.code}`;
    throw new UpstreamError("sodex", "provider_error", known, res.status);
  }
  const parsed = schema.safeParse(env.data.data);
  if (!parsed.success) {
    console.warn(`[market-data] sodex payload failed validation for ${label}: ${parsed.error.issues[0]?.message ?? "schema mismatch"}`);
    throw new UpstreamError("sodex", "malformed", "payload failed schema validation", res.status);
  }
  return parsed.data;
}

let defaultClient: SoDEXClient | null = null;
let defaultPerpsClient: SoDEXClient | null = null;

/** Configured spot client, or null in DEMO_MODE. */
export function getSoDEXClient(): SoDEXClient | null {
  const env = getEnv();
  if (!env.sodexEnabled) return null;
  if (!defaultClient) defaultClient = new SoDEXClient({ baseUrl: env.SODEX_MARKET_DATA_BASE_URL });
  return defaultClient;
}

/** Configured perps client (same gateway, `/perps`), or null in DEMO_MODE. */
export function getSoDEXPerpsClient(): SoDEXClient | null {
  const env = getEnv();
  if (!env.sodexEnabled) return null;
  if (!defaultPerpsClient) defaultPerpsClient = new SoDEXClient({ baseUrl: `${gatewayRoot(env.SODEX_MARKET_DATA_BASE_URL)}/perps` });
  return defaultPerpsClient;
}

/** test helper */
export function resetSoDEXClient(): void {
  defaultClient = null;
  defaultPerpsClient = null;
}
