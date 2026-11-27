/**
 * SoSoValue payloads → lib/types/market contracts. Pure functions; the
 * provenance is supplied by the caller (cache/service layer).
 */
import type { DataProvenance, EtfFlowPoint, EtfFlowSeries, IndexConstituent, IndexSnapshot, MarketSnapshot, NewsCategory, NewsEvidence } from "@/lib/types";
import type { CurrencySnapshot, EtfSummaryRow, IndexConstituentRaw, IndexSnapshotRaw, MacroEventDay, NewsItem } from "./schemas";

export const ASSET_NAMES: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  SOL: "Solana",
  XRP: "XRP",
  DOGE: "Dogecoin",
  BNB: "BNB",
  LTC: "Litecoin",
  LINK: "Chainlink",
  AVAX: "Avalanche",
  DOT: "Polkadot",
  HBAR: "Hedera",
};

export const SUMMARY_MAX_CHARS = 600;

export function toMarketSnapshot(asset: string, raw: CurrencySnapshot, provenance: DataProvenance, name?: string): MarketSnapshot {
  return {
    asset,
    name: name ?? ASSET_NAMES[asset] ?? asset,
    price: raw.price ?? 0,
    // change_pct_24h is a fraction (verified live 2026-11-27: BTC 0.0109 = +1.09%), as for indexes.
    percentageChange24h: raw.change_pct_24h !== null && raw.change_pct_24h !== undefined ? raw.change_pct_24h * 100 : null,
    volume24h: raw.turnover_24h,
    marketCapitalisation: raw.marketcap,
    timestamp: provenance.asOf ?? provenance.fetchedAt,
    provenance,
  };
}

/** Strip HTML to plain text; untrusted input, so no tag is ever kept. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>|<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => {
      const n = Number(code);
      return Number.isFinite(n) && n > 31 && n < 0x10ffff ? String.fromCodePoint(n) : " ";
    })
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

export function truncateText(s: string, max = SUMMARY_MAX_CHARS): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

const MACRO_TAGS = /\b(cpi|fomc|fed|rate|rates|inflation|payrolls|nonfarm|gdp|macro|treasury|yield|pmi|unemployment)\b/i;
const REG_TAGS = /\b(sec|cftc|regulation|regulator|lawsuit|court|legislation|bill|mica)\b/i;
const ETF_TAGS = /\b(etf|etfs|ibit|fbtc|spot etf|flows?)\b/i;
const PROTOCOL_TAGS = /\b(protocol|upgrade|mainnet|testnet|hard ?fork|airdrop|defi|l2|layer ?2)\b/i;

export function categoriseNews(item: Pick<NewsItem, "category" | "tags" | "title">): NewsCategory {
  const tagText = [...(item.tags ?? []), item.title ?? ""].join(" ");
  if (ETF_TAGS.test(tagText)) return "etf";
  if (MACRO_TAGS.test(tagText)) return "macro";
  if (REG_TAGS.test(tagText)) return "regulation";
  if (item.category === 2) return "research";
  if (PROTOCOL_TAGS.test(tagText)) return "protocol";
  if (item.category === 1 || item.category === 3 || item.category === 13) return "market";
  return "other";
}

export function toNewsEvidence(item: NewsItem, provenance: DataProvenance): NewsEvidence {
  const text = htmlToText(item.content ?? "");
  const title = item.title && item.title.trim().length > 0 ? htmlToText(item.title) : truncateText(text, 120) || "Untitled";
  // provider-supplied links are untrusted: only http(s) may reach an href
  const url = [item.original_link, item.source_link].find((u) => typeof u === "string" && /^https?:\/\//i.test(u.trim()))?.trim() ?? "https://sosovalue.com";
  let source = "SoSoValue";
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host) source = host;
  } catch {
    /* keep default */
  }
  return {
    id: `sosovalue:${item.id}`,
    title: truncateText(title, 200),
    summary: truncateText(text),
    category: categoriseNews(item),
    source: item.author && item.author.trim().length > 0 ? `${item.author} via ${source}` : source,
    sourceUrl: url,
    publishedAt: item.release_time ?? provenance.fetchedAt,
    fetchedAt: provenance.fetchedAt,
    provenance,
  };
}

/** Macro calendar days as "macro" evidence items (deterministic ids). */
export function macroDayToNews(day: MacroEventDay, provenance: DataProvenance): NewsEvidence {
  const list = day.events.join(", ");
  return {
    id: `sosovalue:macro:${day.date}`,
    title: `Macro calendar ${day.date}: ${truncateText(list, 120)}`,
    summary: `Scheduled macro releases on ${day.date}: ${list}. Scheduled events are not outcomes; the market reaction depends on actual vs. expected figures.`,
    category: "macro",
    source: "SoSoValue macro calendar",
    sourceUrl: "https://sosovalue.com",
    publishedAt: `${day.date}T00:00:00.000Z`,
    fetchedAt: provenance.fetchedAt,
    provenance,
  };
}

export function toEtfFlowSeries(asset: "BTC" | "ETH", rows: EtfSummaryRow[], provenance: DataProvenance): EtfFlowSeries {
  const points: EtfFlowPoint[] = rows
    .filter((r) => r.total_net_inflow !== null)
    .map((r) => ({
      date: r.date,
      netInflowUsd: r.total_net_inflow ?? 0,
      cumulativeNetInflowUsd: r.cum_net_inflow,
      totalNetAssetsUsd: r.total_net_assets,
      totalVolumeUsd: r.total_value_traded,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { asset, points, latest: points.length > 0 ? points[points.length - 1]! : null, provenance };
}

export function indexDisplayName(ticker: string): string {
  const t = ticker.toLowerCase();
  const known: Record<string, string> = {
    ssimag7: "SSI MAG7 (crypto majors)",
    ssilayer1: "SSI Layer 1",
    ssimeme: "SSI Meme",
    ssidefi: "SSI DeFi",
  };
  return known[t] ?? ticker.toUpperCase();
}

export function toIndexSnapshot(
  ticker: string,
  constituents: IndexConstituentRaw[],
  snapshot: IndexSnapshotRaw,
  provenance: DataProvenance,
  currencyNames: Record<string, string> = {},
): IndexSnapshot {
  const cons: IndexConstituent[] = constituents
    .map((c) => {
      const symbol = c.symbol.toUpperCase();
      return { symbol, name: currencyNames[symbol] ?? ASSET_NAMES[symbol] ?? symbol, weight: c.weight ?? 0 };
    })
    .sort((a, b) => b.weight - a.weight);
  return {
    id: ticker.toLowerCase(),
    name: indexDisplayName(ticker),
    description: `SoSoValue index ${ticker} with ${cons.length} constituent${cons.length === 1 ? "" : "s"}, weights sum to ${cons.reduce((s, c) => s + c.weight, 0).toFixed(2)}.`,
    value: snapshot.price ?? null,
    // index snapshot change is documented as a decimal fraction (-0.0016 = -0.16 %)
    percentageChange24h: snapshot.change_pct_24h !== null && snapshot.change_pct_24h !== undefined ? snapshot.change_pct_24h * 100 : null,
    constituents: cons,
    asOf: provenance.asOf ?? provenance.fetchedAt,
    provenance,
  };
}
