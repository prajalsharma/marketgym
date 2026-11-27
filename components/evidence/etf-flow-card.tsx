"use client";

import { useReducedMotion } from "framer-motion";
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EtfFlowSeries } from "@/lib/types/market";
import { Card, CardContent, CardHeader, CardTitle, DataSourceTag } from "@/components/ui";
import { formatCompact, formatDate } from "@/lib/client/format";
import { cn } from "@/lib/utils";
import { EVIDENCE_CARD } from "./snapshot-card";

function FlowTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: unknown }>;
  label?: unknown;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const value = Number(payload[0]?.value);
  return (
    <div className="rounded-md border border-line-strong bg-surface-overlay px-3 py-2 text-xs text-fg shadow-md">
      <p className="text-muted">{formatDate(String(label))}</p>
      <p className="mt-1 flex items-center gap-2">
        <span
          className={cn("size-2 rounded-[2px]", value < 0 ? "bg-danger" : "bg-success")}
          aria-hidden="true"
        />
        <span>Net inflow</span>
        <span className={cn("ml-auto pl-3 font-mono font-medium tabular-nums", value < 0 ? "text-danger" : "text-success")}>
          {formatCompact(value, { currency: true, signed: true })}
        </span>
      </p>
    </div>
  );
}

export function EtfFlowCard({ series }: { series: EtfFlowSeries }) {
  const reduce = useReducedMotion();
  const points = series.points.slice(-14);
  const latest = series.latest;
  const positiveDays = points.filter((p) => p.netInflowUsd > 0).length;
  const sum = points.reduce((acc, p) => acc + p.netInflowUsd, 0);

  return (
    <Card tone="evidence" className={EVIDENCE_CARD}>
      <CardHeader className="flex flex-row items-baseline justify-between gap-3 space-y-0">
        <CardTitle className="text-base">{series.asset} spot ETF net flows</CardTitle>
        <span className="text-xs text-muted">last {points.length} days</span>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <dt className="text-xs text-muted">Latest day</dt>
            <dd
              className={cn(
                "mt-0.5 font-mono text-3xl font-semibold tabular-nums tracking-tight",
                latest && latest.netInflowUsd < 0 ? "text-danger" : "text-success",
              )}
            >
              {formatCompact(latest?.netInflowUsd, { currency: true, signed: true })}
            </dd>
          </div>
          <div className="text-right">
            <dt className="text-xs text-muted">Positive days</dt>
            <dd className="mt-0.5 font-mono tabular-nums">
              {positiveDays} / {points.length}
            </dd>
            {points.length > 0 ? (
              <dd className="mt-1.5 flex justify-end gap-0.5" aria-hidden="true">
                {points.map((p) => (
                  <span
                    key={p.date}
                    className={cn(
                      "h-2 w-1.5 rounded-[1px]",
                      p.netInflowUsd > 0 ? "bg-success" : p.netInflowUsd < 0 ? "bg-danger" : "bg-line-strong",
                    )}
                  />
                ))}
              </dd>
            ) : null}
          </div>
        </dl>

        {points.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No flow data in this pack.</p>
        ) : (
          <div
            className="mt-4 h-40 w-full text-muted"
            role="img"
            aria-label={`Daily net inflow bars for ${series.asset} ETFs`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={points} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap={4}>
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
                <ReferenceLine y={0} stroke="var(--line-strong)" strokeWidth={1} />
                <Tooltip
                  cursor={{ fill: "var(--surface-raised)", opacity: 0.7 }}
                  content={<FlowTooltip />}
                  wrapperStyle={{ outline: "none" }}
                />
                <Bar
                  dataKey="netInflowUsd"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={!reduce}
                  animationDuration={700}
                  animationEasing="ease-out"
                >
                  {points.map((p) => (
                    <Cell key={p.date} fill={p.netInflowUsd < 0 ? "var(--danger)" : "var(--success)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-evidence-line pt-3 text-sm">
          <div>
            <dt className="text-xs text-muted">Sum, {points.length} days</dt>
            <dd className={cn("mt-0.5 font-mono tabular-nums", sum < 0 ? "text-danger" : sum > 0 ? "text-success" : undefined)}>
              {formatCompact(sum, { currency: true, signed: true })}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Total net assets</dt>
            <dd className="mt-0.5 font-mono tabular-nums">{formatCompact(latest?.totalNetAssetsUsd, { currency: true })}</dd>
          </div>
        </dl>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <DataSourceTag provenance={series.provenance} compact />
          {latest ? <p className="text-xs text-muted">Latest point: {formatDate(latest.date)}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
