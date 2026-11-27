/** Learner-facing labels and small pure helpers for SoDEX Wealth data. No numbers live here. */
import type { WealthFund, WealthFundType, WealthMarketStatus, WealthQuote } from "@/lib/types/wealth";
import type { DataProvenance } from "@/lib/types/market";

export const MARKET_STATUS_LABEL: Record<WealthMarketStatus, string> = {
  open: "Market open",
  "pre-market": "Pre-market",
  "after-hours": "After hours",
  closed: "Market closed",
  "always-open": "Trades 24/7",
  unknown: "Hours unknown",
};

export function marketStatusTone(status: WealthMarketStatus): "success" | "warning" | "neutral" | "info" {
  if (status === "open" || status === "always-open") return "success";
  if (status === "pre-market" || status === "after-hours") return "warning";
  if (status === "closed") return "neutral";
  return "neutral";
}

/** One sentence per fund type, shown in the fund detail panel. */
export const FUND_TYPE_MEANING: Record<WealthFundType, string> = {
  clob: "A tokenised ETF: a token that follows a listed fund and trades on the SoDEX order book, so its price can drift from the fund's own value.",
  escrow_vault:
    "A fund vault: money is pooled and each share is worth the vault's net asset value (NAV), which is set by what the vault holds.",
  bridged_vault:
    "A yield vault: deposits are lent out elsewhere and the share value grows with the interest earned, which changes every day.",
  "ssi-v2":
    "An index: one token that holds a basket of assets at set weights, so its value follows the whole basket rather than one coin.",
  other: "A fund listed on SoDEX Wealth. Check how it is priced before comparing it with the others.",
};

/** The lesson that explains each fund type best. */
export function relatedLesson(fundType: WealthFundType): { href: string; label: string } {
  switch (fundType) {
    case "clob":
      return { href: "/app/learn/wealth?skill=wealth.nav-vs-price", label: "Lesson: NAV versus market price" };
    case "bridged_vault":
      return { href: "/app/learn/wealth?skill=wealth.yield-apy", label: "Lesson: what an APY does and does not promise" };
    case "ssi-v2":
      return { href: "/app/learn/indexes?skill=indexes.index-nav", label: "Lesson: how an index token is valued" };
    default:
      return { href: "/app/learn/wealth?skill=wealth.fund-types", label: "Lesson: types of funds" };
  }
}

/** The return figure that fits the fund: 1Y return for priced funds, 7-day APY for yield vaults. */
export function headlineReturn(q: WealthQuote | null | undefined): { label: string; value: number | null } {
  if (!q) return { label: "1Y return", value: null };
  if (q.roi1YPct !== null) return { label: "1Y return", value: q.roi1YPct };
  if (q.apy7dPct !== null) return { label: "7-day APY", value: q.apy7dPct };
  if (q.roi1MPct !== null) return { label: "1M return", value: q.roi1MPct };
  return { label: "1Y return", value: null };
}

export function quoteFor(quotes: WealthQuote[], fundId: string): WealthQuote | null {
  return quotes.find((q) => q.fundId === fundId) ?? null;
}

export function fundName(funds: WealthFund[], fundId: string): string {
  return funds.find((f) => f.fundId === fundId)?.name ?? fundId;
}

/** Distinct provenance entries (by provider + kind), so one tag stands for many rows. */
export function distinctProvenance(list: DataProvenance[]): DataProvenance[] {
  const seen = new Map<string, DataProvenance>();
  for (const p of list) {
    const key = `${p.provider}:${p.kind}`;
    const prev = seen.get(key);
    // keep the oldest time so the tag never overstates freshness
    if (!prev || Date.parse(p.asOf ?? p.fetchedAt) < Date.parse(prev.asOf ?? prev.fetchedAt)) seen.set(key, p);
  }
  return [...seen.values()];
}

export const PRICE_RANGES = ["1M", "3M", "1Y"] as const;
export type PriceRange = (typeof PRICE_RANGES)[number];

/**
 * Some provider figures are far outside anything a fund can earn (a 7-day APY in
 * the millions of percent, usually from a tiny or newly seeded vault). We never
 * hide or change them; we show them flat, without animation, next to a plain note.
 */
export const UNUSUAL_PCT_THRESHOLD = 300;
export function isUnusualPct(v: number | null | undefined): boolean {
  return v !== null && v !== undefined && Number.isFinite(v) && Math.abs(v) >= UNUSUAL_PCT_THRESHOLD;
}
export const UNUSUAL_NOTE = "Unusual value, check the source";

export type SortKey = "name" | "price" | "change" | "return";
export type SortDir = "asc" | "desc";

/** Sort the board by a column. Missing values always sink to the bottom. */
export function sortFunds(funds: WealthFund[], quotes: WealthQuote[], key: SortKey, dir: SortDir): WealthFund[] {
  const val = (f: WealthFund): number | string | null => {
    const q = quoteFor(quotes, f.fundId);
    if (key === "name") return f.name.toLowerCase();
    if (key === "price") return q?.price ?? null;
    if (key === "change") return q?.changePct ?? null;
    return headlineReturn(q).value;
  };
  const sign = dir === "asc" ? 1 : -1;
  return [...funds].sort((a, b) => {
    const va = val(a);
    const vb = val(b);
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    if (typeof va === "string" && typeof vb === "string") return va.localeCompare(vb) * sign;
    return ((va as number) - (vb as number)) * sign;
  });
}
