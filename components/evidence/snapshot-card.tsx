import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { MarketSnapshot } from "@/lib/types/market";
import { Card, CardContent, CardHeader, CardTitle, DataSourceTag } from "@/components/ui";
import { formatCompact, formatPercent, formatUsd } from "@/lib/client/format";
import { cn } from "@/lib/utils";

/** Shared surface treatment for every evidence card: inner highlight, hairline, subtle hover lift. */
export const EVIDENCE_CARD =
  "inset-shadow-[0_1px_0_rgb(255_255_255/0.04)] transition-[translate,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-line-strong hover:shadow-sm motion-reduce:hover:translate-y-0";

export function SnapshotCard({ snapshot }: { snapshot: MarketSnapshot }) {
  const change = snapshot.percentageChange24h;
  const down = change !== null && change < 0;
  const Arrow = down ? ArrowDownRight : ArrowUpRight;
  return (
    <Card tone="evidence" className={cn(EVIDENCE_CARD, "h-full")}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b-0 pb-0!">
        <CardTitle className="text-sm font-medium">
          {snapshot.name} <span className="font-mono font-normal text-muted">{snapshot.asset}</span>
        </CardTitle>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-sm tabular-nums",
            change === null ? "bg-surface-sunken text-muted" : down ? "bg-danger-soft text-danger" : "bg-success-soft text-success",
          )}
        >
          {change === null ? null : <Arrow className="size-3.5" aria-hidden="true" />}
          {formatPercent(change)} <span className="text-muted">24h</span>
        </span>
      </CardHeader>
      <CardContent className="pt-2!">
        <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight">{formatUsd(snapshot.price)}</p>
        <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-evidence-line pt-3 text-sm">
          <div>
            <dt className="text-xs text-muted">24h volume</dt>
            <dd className="mt-0.5 font-mono tabular-nums">{formatCompact(snapshot.volume24h, { currency: true })}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Market cap</dt>
            <dd className="mt-0.5 font-mono tabular-nums">
              {formatCompact(snapshot.marketCapitalisation, { currency: true })}
            </dd>
          </div>
        </dl>
        <div className="mt-3">
          <DataSourceTag provenance={snapshot.provenance} compact />
        </div>
      </CardContent>
    </Card>
  );
}
