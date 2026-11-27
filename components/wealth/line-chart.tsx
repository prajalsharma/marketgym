"use client";

import { useId } from "react";
import { useReducedMotion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";

export interface LinePoint {
  /** ISO time or YYYY-MM-DD */
  x: string;
  y: number;
}

interface Props {
  points: LinePoint[];
  /** accessible summary of what the line shows */
  label: string;
  /** name shown in the tooltip, e.g. "Price" */
  seriesName: string;
  formatY: (v: number) => string;
  formatX?: (x: string) => string;
  /** draws a dashed line at 0 (for returns) */
  zeroLine?: boolean;
  /** "chart-1" by default; returns use chart-3 */
  color?: "chart-1" | "chart-3";
  /** dims the chart while a new range loads over it */
  stale?: boolean;
  className?: string;
}

function shortDate(x: string): string {
  const d = new Date(x);
  if (Number.isNaN(d.getTime())) return x;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * Single-series line with a soft area, axes and a keyboard-reachable tooltip
 * (recharts accessibility layer: focus the chart, then use the arrow keys).
 * The line passes through every real value from the API; nothing is invented.
 */
export function SeriesLineChart({
  points,
  label,
  seriesName,
  formatY,
  formatX = shortDate,
  zeroLine,
  color = "chart-1",
  stale = false,
  className,
}: Props) {
  const reduce = useReducedMotion() ?? false;
  const gid = useId().replace(/:/g, "");
  const ys = points.map((p) => p.y);
  const first = points[0];
  const last = points[points.length - 1];
  const summary =
    points.length > 1
      ? `${label}. From ${formatY(first.y)} on ${formatX(first.x)} to ${formatY(last.y)} on ${formatX(last.x)}; low ${formatY(Math.min(...ys))}, high ${formatY(Math.max(...ys))}.`
      : label;
  const stroke = `var(--${color})`;

  return (
    <figure className={cn("relative h-56 w-full rounded-md border border-evidence-line bg-surface-sunken/60 pt-2 pr-1 text-subtle transition-opacity duration-300", stale && "opacity-50", className)}>
      <figcaption className="sr-only">{summary}</figcaption>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} accessibilityLayer>
          <defs>
            <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.3} />
              <stop offset="65%" stopColor={stroke} stopOpacity={0.06} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="x"
            tickFormatter={formatX}
            tick={{ fontSize: 11, fill: "currentColor" }}
            axisLine={false}
            tickLine={false}
            tickMargin={6}
            minTickGap={40}
          />
          <YAxis
            dataKey="y"
            tickFormatter={(v: number) => formatY(v)}
            tick={{ fontSize: 11, fill: "currentColor" }}
            axisLine={false}
            tickLine={false}
            width={62}
            domain={["auto", "auto"]}
          />
          {zeroLine ? <ReferenceLine y={0} stroke="var(--chart-axis)" strokeDasharray="4 4" /> : null}
          <Tooltip
            cursor={{ stroke: "var(--line-strong)", strokeDasharray: "3 3" }}
            contentStyle={{
              background: "var(--surface-overlay)",
              border: "1px solid var(--line-strong)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--fg)",
              boxShadow: "var(--shadow-md)",
              padding: "6px 10px",
            }}
            labelStyle={{ color: "var(--fg-muted)", marginBottom: 2 }}
            itemStyle={{ color: "var(--fg)", padding: 0 }}
            labelFormatter={(x) => formatX(String(x))}
            formatter={(v) => [formatY(Number(v)), seriesName]}
          />
          <Area
            type="monotone"
            dataKey="y"
            stroke={stroke}
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={`url(#fill-${gid})`}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)", fill: stroke }}
            isAnimationActive={!reduce}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </figure>
  );
}
