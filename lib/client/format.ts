/** Display formatting for numbers, dates and ids. Pure functions, safe anywhere. */

const usd0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const usd2 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatUsd(value: number | null | undefined, opts?: { decimals?: 0 | 2 }): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const decimals = opts?.decimals ?? (Math.abs(value) >= 1000 ? 0 : 2);
  return decimals === 0 ? usd0.format(value) : usd2.format(value);
}

/** 1.23B, 456.7M, 12.3K, with $ prefix when currency = true */
export function formatCompact(
  value: number | null | undefined,
  opts?: { currency?: boolean; signed?: boolean; digits?: number },
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  const digits = opts?.digits ?? (abs >= 100 ? 1 : 2);
  let num: string;
  if (abs >= 1e12) num = `${(abs / 1e12).toFixed(digits)}T`;
  else if (abs >= 1e9) num = `${(abs / 1e9).toFixed(digits)}B`;
  else if (abs >= 1e6) num = `${(abs / 1e6).toFixed(digits)}M`;
  else if (abs >= 1e3) num = `${(abs / 1e3).toFixed(digits)}K`;
  else num = abs.toFixed(abs < 10 ? 2 : 0);
  const sign = value < 0 ? "−" : opts?.signed && value > 0 ? "+" : "";
  return `${sign}${opts?.currency ? "$" : ""}${num}`;
}

export function formatPercent(
  value: number | null | undefined,
  opts?: { signed?: boolean; digits?: number },
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const digits = opts?.digits ?? 2;
  const sign = value < 0 ? "−" : opts?.signed !== false && value > 0 ? "+" : "";
  return `${sign}${Math.abs(value).toFixed(digits)}%`;
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

/** Quantity formatting that respects a lot size (e.g. 0.00001 → 5 decimals). */
export function formatQuantity(value: number, lotSize: number): string {
  const decimals = decimalsOf(lotSize);
  return value.toLocaleString("en-US", {
    minimumFractionDigits: Math.min(decimals, 8),
    maximumFractionDigits: Math.min(decimals, 8),
  });
}

export function formatPrice(value: number | null | undefined, tickSize: number): string {
  if (value === null || value === undefined) return "—";
  const decimals = decimalsOf(tickSize);
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function decimalsOf(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 2;
  if (step >= 1) return 0;
  const s = step.toExponential();
  const match = /e-(\d+)$/.exec(s);
  if (match) {
    const mantissaDecimals = (s.split("e")[0].split(".")[1] ?? "").length;
    return Number(match[1]) + mantissaDecimals;
  }
  return (step.toString().split(".")[1] ?? "").length;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function formatRelative(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = d.getTime() - now.getTime();
  const abs = Math.abs(diff);
  const minutes = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  let text: string;
  if (minutes < 1) text = "just now";
  else if (minutes < 60) text = `${minutes} min`;
  else if (hours < 24) text = `${hours} h`;
  else if (days < 30) text = `${days} d`;
  else return formatDate(iso);
  if (text === "just now") return text;
  return diff < 0 ? `${text} ago` : `in ${text}`;
}

/** "flows-equal-price-impact" → "Flows equal price impact"; "markets.market-cap" → "Market cap" */
export function humanise(id: string): string {
  const tail = id.includes(".") ? id.split(".").pop() ?? id : id;
  const words = tail.replace(/[-_]+/g, " ").trim();
  if (!words) return id;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
