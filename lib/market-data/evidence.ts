/**
 * buildEvidencePack(requirements): resolves ExerciseTemplate.evidenceRequirements
 * tokens into a frozen EvidencePack.
 *
 *   snapshot:BTC | snapshot:ETH      news:market | news:etf | news:macro
 *   etf:BTC | etf:ETH                index:all
 *   orderbook:<symbol>               (e.g. orderbook:vBTC_vUSDC)
 */
import type { EvidencePack, NewsCategory } from "@/lib/types";
import { getMarketServices } from "./services";

const NEWS_PER_CATEGORY = 5;

export interface EvidenceRequirement {
  kind: "snapshot" | "news" | "etf" | "index" | "orderbook";
  arg: string;
}

export function parseRequirement(token: string): EvidenceRequirement | null {
  const [kind, arg] = token.split(":", 2).map((s) => s.trim());
  if (!kind || !arg) return null;
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
      return /^[A-Za-z0-9]+_[A-Za-z0-9]+$/.test(arg) ? { kind, arg } : null;
    default:
      return null;
  }
}

export async function buildEvidencePack(requirements: string[], deps = getMarketServices()): Promise<EvidencePack> {
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

  const snapshotAssets = [...new Set(reqs.filter((r) => r.kind === "snapshot").map((r) => r.arg))];
  const newsCategories = [...new Set(reqs.filter((r) => r.kind === "news").map((r) => r.arg as NewsCategory))];
  const etfAssets = [...new Set(reqs.filter((r) => r.kind === "etf").map((r) => r.arg as "BTC" | "ETH"))];
  const wantIndexes = reqs.some((r) => r.kind === "index");
  const orderBookMarkets = [...new Set(reqs.filter((r) => r.kind === "orderbook").map((r) => r.arg))];

  const [snapshots, newsLists, etfFlows, indexes, orderBooks] = await Promise.all([
    snapshotAssets.length > 0 ? deps.snapshots.getSnapshots(snapshotAssets) : Promise.resolve([]),
    Promise.all(newsCategories.map((category) => deps.news.getNews({ limit: NEWS_PER_CATEGORY, category }))),
    Promise.all(etfAssets.map((asset) => deps.etf.getFlows(asset))),
    wantIndexes ? deps.indexes.getIndexes() : Promise.resolve([]),
    Promise.all(orderBookMarkets.map((m) => deps.orderBooks.getOrderBook(m, 20))),
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
  return pack;
}
