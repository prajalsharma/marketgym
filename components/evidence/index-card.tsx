import type { IndexSnapshot } from "@/lib/types/market";
import { Card, CardContent, CardHeader, CardTitle, DataSourceTag } from "@/components/ui";
import { formatNumber, formatPercent } from "@/lib/client/format";
import { cn } from "@/lib/utils";

export function IndexCard({ index }: { index: IndexSnapshot }) {
  const top = index.constituents.slice(0, 5);
  const topShare = top.reduce((acc, c) => acc + c.weight, 0);
  const change = index.percentageChange24h;
  return (
    <Card tone="evidence">
      <CardHeader className="flex flex-row items-baseline justify-between gap-3 space-y-0">
        <CardTitle className="text-base">{index.name}</CardTitle>
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
        <p className="font-mono text-xl tabular-nums tracking-tight">{formatNumber(index.value)}</p>
        <p className="mt-1 text-xs text-muted">{index.description}</p>
        {top.length > 0 ? (
          <div className="mt-3">
            <div className="flex items-baseline justify-between text-xs text-muted">
              <span>Top constituents</span>
              <span>
                top {top.length} = {formatPercent(topShare * 100, { signed: false, digits: 0 })}
              </span>
            </div>
            <ul className="mt-1.5 space-y-1.5">
              {top.map((c) => (
                <li key={c.symbol} className="grid grid-cols-[3.5rem_1fr_3rem] items-center gap-2 text-sm">
                  <span className="font-mono uppercase">{c.symbol}</span>
                  <div className="h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(c.weight * 100)}%` }} />
                  </div>
                  <span className="text-right font-mono text-xs tabular-nums text-muted">
                    {formatPercent(c.weight * 100, { signed: false, digits: 1 })}
                  </span>
                </li>
              ))}
            </ul>
            {index.constituents.length > top.length ? (
              <p className="mt-1.5 text-xs text-muted">
                + {index.constituents.length - top.length} more constituents
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="mt-3">
          <DataSourceTag provenance={index.provenance} compact />
        </div>
      </CardContent>
    </Card>
  );
}
