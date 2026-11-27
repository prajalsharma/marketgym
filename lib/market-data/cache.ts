/**
 * In-memory TTL cache with stale-after-failure, in-flight de-duplication,
 * and DataProvenance on every result. Per instance (documented trade-off).
 */
import type { DataProvenance } from "@/lib/types";

interface Entry<T> {
  value: T;
  fetchedAt: number;
  expiresAt: number;
  asOf?: string;
}

export interface CachedResult<T> {
  value: T;
  provenance: DataProvenance;
}

export interface CacheFetchOptions<T> {
  key: string;
  ttlMs: number;
  provider: DataProvenance["provider"];
  sourceUrl: string;
  fetch: () => Promise<T>;
  /** when the provider states a data time different from fetch time */
  asOf?: (value: T) => string | undefined;
  /** how long to keep serving a stale copy after a failure before retrying (default: min(ttl, 30 s)) */
  retryAfterFailureMs?: number;
  now?: () => number;
}

export class MarketDataCache {
  private readonly entries = new Map<string, Entry<unknown>>();
  private readonly inflight = new Map<string, Promise<CachedResult<unknown>>>();

  constructor(private readonly maxEntries = 500) {}

  peek<T>(key: string): Entry<T> | undefined {
    return this.entries.get(key) as Entry<T> | undefined;
  }

  set<T>(key: string, value: T, ttlMs: number, now = Date.now(), asOf?: string): void {
    if (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(key, { value, fetchedAt: now, expiresAt: now + ttlMs, ...(asOf ? { asOf } : {}) });
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
    this.inflight.clear();
  }

  /**
   * live → cached (fresh) → cached (stale after a failure, with note) → throws.
   * Throwing means "no copy at all"; callers decide whether to fall back to demo.
   */
  async get<T>(opts: CacheFetchOptions<T>): Promise<CachedResult<T>> {
    const now = opts.now ?? Date.now;
    const entry = this.peek<T>(opts.key);
    const t = now();
    if (entry && entry.expiresAt > t) {
      return { value: entry.value, provenance: provenanceFor("cached", opts, entry) };
    }
    const pending = this.inflight.get(opts.key) as Promise<CachedResult<T>> | undefined;
    if (pending) return pending;

    const run = (async (): Promise<CachedResult<T>> => {
      try {
        const value = await opts.fetch();
        const fetchedAt = now();
        const asOf = opts.asOf?.(value);
        this.set(opts.key, value, opts.ttlMs, fetchedAt, asOf);
        const fresh = this.peek<T>(opts.key)!;
        return { value, provenance: provenanceFor("live", opts, fresh) };
      } catch (err) {
        const stale = this.peek<T>(opts.key);
        if (stale) {
          const holdMs = opts.retryAfterFailureMs ?? Math.min(opts.ttlMs, 30_000);
          stale.expiresAt = now() + holdMs; // don't hammer a failing provider
          const reason = err instanceof Error ? err.message : "provider failed";
          const note = `Provider failed (${truncate(reason, 120)}); serving cached copy from ${new Date(stale.fetchedAt).toISOString()}.`;
          return { value: stale.value, provenance: { ...provenanceFor("cached", opts, stale), note } };
        }
        throw err;
      } finally {
        this.inflight.delete(opts.key);
      }
    })();
    this.inflight.set(opts.key, run as Promise<CachedResult<unknown>>);
    return run;
  }
}

function provenanceFor<T>(kind: "live" | "cached", opts: CacheFetchOptions<T>, entry: Entry<T>): DataProvenance {
  return {
    kind,
    provider: opts.provider,
    sourceUrl: opts.sourceUrl,
    fetchedAt: new Date(entry.fetchedAt).toISOString(),
    ...(entry.asOf ? { asOf: entry.asOf } : {}),
    expiresAt: new Date(entry.expiresAt).toISOString(),
  };
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export const marketDataCache = new MarketDataCache();

export const TTL = {
  snapshot: 120_000,
  overview: 120_000,
  etf: 15 * 60_000,
  indexes: 10 * 60_000,
  news: 10 * 60_000,
  currencies: 60 * 60_000,
  orderbook: 15_000,
  symbols: 60 * 60_000,
  // Wave 2 (docs/CONTRACTS.md)
  perpsOrderbook: 15_000,
  wealthBoard: 60_000,
  wealthFund: 10 * 60_000,
  wealthPrice: 30 * 60_000,
  wealthDca: 6 * 60 * 60_000,
  rewardsIncentives: 10 * 60_000,
  rewardsFeed: 5 * 60_000,
} as const;
