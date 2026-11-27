/**
 * buildEvidencePack(requirements): resolves ExerciseTemplate.evidenceRequirements
 * tokens into a frozen EvidencePack.
 *
 *   snapshot:BTC | snapshot:ETH      news:market | news:etf | news:macro
 *   etf:BTC | etf:ETH                index:all
 *   orderbook:<symbol>               (e.g. orderbook:vBTC_vUSDC, orderbook:vANT_vUSDC)
 *   orderbook:perps:<SYMBOL>         (e.g. orderbook:perps:ANT-USD)
 *   wealth:board                     (all funds + quotes)
 *   wealth:fund:<fundId>             (fund + quote, e.g. wealth:fund:antb)
 *   wealth:price:<fundId>:<range>    (range 1W|1M|3M|1Y, e.g. wealth:price:vQQQ:3M)
 *   wealth:dca:<fundId>:<range>      (range 3M|6M|1Y, e.g. wealth:dca:vVOO:1Y)
 *   rewards:incentives | rewards:feed
 *
 * Wealth/rewards tokens never throw: an unknown fund (or a series with no
 * data at all) is skipped with a logged warning.
 */
import type { DcaSimulation, EvidencePack, NewsCategory, WealthFund, WealthPriceSeries, WealthQuote } from "@/lib/types";
import { FUND_ID_RE } from "./sodex/allow-list";
import { PERPS_MARKET_RE, SPOT_MARKET_RE } from "./sodex/normalise";
import { DCA_RANGES, PRICE_RANGES, type DcaRange, type PriceRange } from "./sodex/wealth-normalise";
import { getMarketServices } from "./services";

const NEWS_PER_CATEGORY = 5;

export interface EvidenceRequirement {
  kind: "snapshot" | "news" | "etf" | "index" | "orderbook" | "wealth-board" | "wealth-fund" | "wealth-price" | "wealth-dca" | "rewards";
  /** asset / category / market / fundId / "board" / "incentives" | "feed" */
  arg: string;
  /** wealth-price / wealth-dca only */
  range?: string;
}

function parseWealth(rest: string): EvidenceRequirement | null {
  if (rest === "board") return { kind: "wealth-board", arg: "board" };
  const parts = rest.split(":");
  const [sub, fundId, range] = parts;
  if (!sub || !fundId || !FUND_ID_RE.test(fundId)) return null;
  if (sub === "fund" && parts.length === 2) return { kind: "wealth-fund", arg: fundId };
  if (sub === "price" && parts.length === 3 && range && (PRICE_RANGES as readonly string[]).includes(range)) return { kind: "wealth-price", arg: fundId, range };
  if (sub === "dca" && parts.length === 3 && range && (DCA_RANGES as readonly string[]).includes(range)) return { kind: "wealth-dca", arg: fundId, range };
  return null;
}

export function parseRequirement(token: string): EvidenceRequirement | null {
  const t = token.trim();
  const i = t.indexOf(":");
  if (i <= 0) return null;
  const kind = t.slice(0, i).trim();
  const arg = t.slice(i + 1).trim();
  if (!arg) return null;
  switch (kind) {
    case "snapshot":
      return { kind, arg: arg.toUpperCase() };
    case "news":
      return arg === "market" || arg === "etf" || arg === "macro" ? { kind, arg } : null;
    case "etf":
      return arg.toUpperCase() === "BTC" || arg.toUpperCase() === "ETH" ? { kind, arg: arg.toUpperCase() } : null;
    case "index":
      return arg === "all" ? { kind, arg } : null;
    case "orderbook":
      return SPOT_MARKET_RE.test(arg) || PERPS_MARKET_RE.test(arg) ? { kind, arg } : null;
    case "wealth":
      return parseWealth(arg);
    case "rewards":
      return arg === "incentives" || arg === "feed" ? { kind, arg } : null;
    default:
      return null;
  }
}

/** run a wealth/rewards fetch; failures are logged and skipped, never thrown */
async function soft<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    console.warn(`[evidence] skipping ${label}: ${err instanceof Error ? err.message : "unknown error"}`);
    return null;
  }
}

function uniq<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

type Services = ReturnType<typeof getMarketServices>;
/** wealth/rewards are optional so older callers (and tests) that pass only the Wave 1 services keep working */
export type EvidenceDeps = Omit<Services, "wealth" | "rewards"> & Partial<Pick<Services, "wealth" | "rewards">>;

export async function buildEvidencePack(requirements: string[], services: EvidenceDeps = getMarketServices()): Promise<EvidencePack> {
  const deps = { ...services, wealth: services.wealth ?? getMarketServices().wealth, rewards: services.rewards ?? getMarketServices().rewards };
  const pack: EvidencePack = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    snapshots: [],
    news: [],
    etfFlows: [],
    indexes: [],
    orderBooks: [],
  };

  const parsed = requirements.map(parseRequirement);
  const unknown = requirements.filter((_, i) => parsed[i] === null);
  if (unknown.length > 0) console.warn(`[evidence] ignoring unknown requirement tokens: ${unknown.join(", ")}`);
  const reqs = parsed.filter((r): r is EvidenceRequirement => r !== null);
  const args = (kind: EvidenceRequirement["kind"]) => uniq(reqs.filter((r) => r.kind === kind).map((r) => r.arg));
  const ranged = (kind: "wealth-price" | "wealth-dca") => uniq(reqs.filter((r) => r.kind === kind).map((r) => `${r.arg}|${r.range}`)).map((k) => k.split("|") as [string, string]);

  const snapshotAssets = args("snapshot");
  const newsCategories = args("news") as NewsCategory[];
  const etfAssets = args("etf") as Array<"BTC" | "ETH">;
  const wantIndexes = reqs.some((r) => r.kind === "index");
  const orderBookMarkets = args("orderbook");
  const wantBoard = reqs.some((r) => r.kind === "wealth-board");
  const fundIds = args("wealth-fund");
  const prices = ranged("wealth-price");
  const dcas = ranged("wealth-dca");
  const rewards = args("rewards");
  const wantWealth = wantBoard || fundIds.length > 0 || prices.length > 0 || dcas.length > 0;

  const [snapshots, newsLists, etfFlows, indexes, orderBooks, board, funds, priceSeries, dcaSims, incentives, feed] = await Promise.all([
    snapshotAssets.length > 0 ? deps.snapshots.getSnapshots(snapshotAssets) : Promise.resolve([]),
    Promise.all(newsCategories.map((category) => deps.news.getNews({ limit: NEWS_PER_CATEGORY, category }))),
    Promise.all(etfAssets.map((asset) => deps.etf.getFlows(asset))),
    wantIndexes ? deps.indexes.getIndexes() : Promise.resolve([]),
    Promise.all(orderBookMarkets.map((m) => deps.orderBooks.getOrderBook(m, 20))),
    wantBoard ? soft("wealth:board", () => deps.wealth.getBoard()) : Promise.resolve(null),
    Promise.all(fundIds.map((id) => soft(`wealth:fund:${id}`, () => deps.wealth.getFund(id)))),
    Promise.all(prices.map(([id, r]) => soft(`wealth:price:${id}:${r}`, () => deps.wealth.getPriceHistory(id, r as PriceRange)))),
    Promise.all(dcas.map(([id, r]) => soft(`wealth:dca:${id}:${r}`, () => deps.wealth.getDca(id, r as DcaRange)))),
    rewards.includes("incentives") ? soft("rewards:incentives", () => deps.rewards.getIncentives()) : Promise.resolve(null),
    rewards.includes("feed") ? soft("rewards:feed", () => deps.rewards.getFeed()) : Promise.resolve(null),
  ]);

  pack.snapshots = snapshots;
  const seen = new Set<string>();
  for (const list of newsLists) {
    for (const n of list) {
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      pack.news.push(n);
    }
  }
  pack.etfFlows = etfFlows;
  pack.indexes = indexes;
  pack.orderBooks = orderBooks;

  if (wantWealth) {
    // fund detail (has fees) wins over the board row for the same fund
    const fundMap = new Map<string, WealthFund>();
    const quoteMap = new Map<string, WealthQuote>();
    for (const f of board?.funds ?? []) fundMap.set(f.fundId, f);
    for (const q of board?.quotes ?? []) quoteMap.set(q.fundId, q);
    for (const f of funds) {
      if (!f) continue;
      const { quote, ...fund } = f;
      fundMap.set(fund.fundId, fund);
      if (quote) quoteMap.set(quote.fundId, quote);
    }
    pack.wealthFunds = [...fundMap.values()];
    pack.wealthQuotes = [...quoteMap.values()];
    pack.wealthPrices = priceSeries.filter((p): p is WealthPriceSeries => p !== null);
    pack.dcaSimulations = dcaSims.filter((d): d is DcaSimulation => d !== null);
  }
  if (rewards.includes("incentives")) pack.rewardIncentives = incentives;
  if (rewards.includes("feed")) pack.rewardFeed = feed;
  return pack;
}
