import { formatPercent } from "@/lib/client/format";
import { UNUSUAL_NOTE, isUnusualPct } from "@/lib/client/wealth";
import { cn } from "@/lib/utils";

export function changeClass(v: number | null | undefined): string {
  if (v === null || v === undefined) return "text-muted";
  return v < 0 ? "text-danger" : v > 0 ? "text-success" : "text-fg";
}

/**
 * A percentage from SoDEX Wealth. Ordinary values are coloured by sign.
 * Implausible ones (see isUnusualPct) are printed in full, uncoloured, with a
 * plain note, so nobody mistakes a data glitch for a great return.
 */
export function PctValue({
  value,
  className,
  noteClassName,
}: {
  value: number | null | undefined;
  className?: string;
  noteClassName?: string;
}) {
  if (isUnusualPct(value)) {
    const sign = value! < 0 ? "−" : "+";
    const full = `${sign}${Math.abs(value!).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
    return (
      <span className="inline-flex flex-col">
        <span className={cn("tabular font-mono text-fg", className)}>{full}</span>
        <span className={cn("text-xs text-warning", noteClassName)}>{UNUSUAL_NOTE}</span>
      </span>
    );
  }
  return <span className={cn("tabular font-mono", changeClass(value), className)}>{formatPercent(value)}</span>;
}
