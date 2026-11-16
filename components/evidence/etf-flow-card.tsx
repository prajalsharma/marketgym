"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EtfFlowSeries } from "@/lib/types/market";
import { Card, CardContent, CardHeader, CardTitle, DataSourceTag } from "@/components/ui";
import { formatCompact, formatDate } from "@/lib/client/format";
import { cn } from "@/lib/utils";

export function EtfFlowCard({ series }: { series: EtfFlowSeries }) {
  const points = series.points.slice(-14);
  const latest = series.latest;
  const positiveDays = points.filter((p) => p.netInflowUsd > 0).length;
  const sum = points.reduce((acc, p) => acc + p.netInflowUsd, 0);

  return (
    <Card tone="evidence">
      <CardHeader className="flex flex-row items-baseline justify-between gap-3 space-y-0">
        <CardTitle className="text-base">{series.asset} spot ETF net flows</CardTitle>
        <span className="text-xs text-muted">last {points.length} days</span>
      </CardHeader>
      <CardContent>
        {points.length === 0 ? (
          <p className="text-sm text-muted">No flow data in this pack.</p>
        ) : (
          <div className="h-36 w-full" role="img" aria-label={`Daily net inflow bars for ${series.asset} ETFs`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={points} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap={3}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => d.slice(5)}
                  tick={{ fontSize: 10, fill: "currentColor" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(v: number) => formatCompact(v, { digits: 0 })}
                  tick={{ fontSize: 10, fill: "currentColor" }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  cursor={{ fill: "var(--surface-raised)" }}
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--fg)",
                  }}
                  labelFormatter={(d) => formatDate(String(d))}
                  formatter={(v) => [formatCompact(Number(v), { currency: true, signed: true }), "Net inflow"]}
                />
                <Bar dataKey="netInflowUsd" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                  {points.map((p) => (
                    <Cell key={p.date} fill={p.netInflowUsd < 0 ? "var(--danger)" : "var(--success)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted">Latest day</dt>
            <dd className={cn("font-mono tabular-nums", latest && latest.netInflowUsd < 0 ? "text-danger" : "text-success")}>
              {formatCompact(latest?.netInflowUsd, { currency: true, signed: true })}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Sum, {points.length} days</dt>
            <dd className="font-mono tabular-nums">{formatCompact(sum, { currency: true, signed: true })}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Positive days</dt>
            <dd className="font-mono tabular-nums">
              {positiveDays} / {points.length}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Total net assets</dt>
            <dd className="font-mono tabular-nums">{formatCompact(latest?.totalNetAssetsUsd, { currency: true })}</dd>
          </div>
        </dl>
        {latest ? <p className="mt-2 text-xs text-muted">Latest point: {formatDate(latest.date)}</p> : null}
        <div className="mt-3">
          <DataSourceTag provenance={series.provenance} compact />
        </div>
      </CardContent>
    </Card>
  );
}
