import type { MarketSnapshot } from "@/lib/types/market";
import { Card, CardContent, CardHeader, CardTitle, DataSourceTag } from "@/components/ui";
import { formatCompact, formatPercent, formatUsd } from "@/lib/client/format";
import { cn } from "@/lib/utils";

export function SnapshotCard({ snapshot }: { snapshot: MarketSnapshot }) {
  const change = snapshot.percentageChange24h;
  return (
    <Card tone="evidence">
      <CardHeader className="flex flex-row items-baseline justify-between gap-3 space-y-0">
        <CardTitle className="text-base">
          {snapshot.name} <span className="font-normal text-muted">{snapshot.asset}</span>
        </CardTitle>
        <span
          className={cn(
            "font-mono text-sm tabular-nums",
            change === null ? "text-muted" : change < 0 ? "text-danger" : "text-success",
          )}
        >
          {formatPercent(change)} <span className="text-muted">24h</span>
        </span>
      </CardHeader>
      <CardContent>
        <p className="font-mono text-xl tabular-nums tracking-tight">{formatUsd(snapshot.price)}</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted">24h volume</dt>
          <dd className="text-right font-mono tabular-nums">{formatCompact(snapshot.volume24h, { currency: true })}</dd>
          <dt className="text-muted">Market cap</dt>
          <dd className="text-right font-mono tabular-nums">
            {formatCompact(snapshot.marketCapitalisation, { currency: true })}
          </dd>
        </dl>
        <div className="mt-3">
          <DataSourceTag provenance={snapshot.provenance} compact />
        </div>
      </CardContent>
    </Card>
  );
}
